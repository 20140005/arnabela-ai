from services.simulation_service import (
    evaluate_customer_mock,
    evaluate_customer_with_retry,
    get_default_evaluator,
    run_simulation,
    use_mock_evaluator,
)
from services.customer_service import get_customer_by_id
from models.customer_response import CustomerResponse
from models.test_input import ProductTestInput
from services import ai_customer_service as ai_module
from services import simulation_service as simulation_module


PRODUCT = ProductTestInput(
    product_name="AI Field Service Assistant",
    description=(
        "An AI assistant for Australian tradespeople "
        "that reduces administrative work."
    ),
    price=199,
    key_features=[
        "Voice-to-job-note conversion",
        "Automatic quote generation",
        "Automatic invoice preparation",
    ],
    target_market=(
        "Australian electricians, plumbers and builders"
    ),
)


def test_mock_evaluator_is_deterministic():
    customer = get_customer_by_id("001")

    assert customer is not None

    first = evaluate_customer_mock(customer, PRODUCT)
    second = evaluate_customer_mock(customer, PRODUCT)

    assert first == second


def test_different_customers_can_make_different_decisions():
    budget_customer = get_customer_by_id("001")
    premium_customer = get_customer_by_id("011")

    assert budget_customer is not None
    assert premium_customer is not None

    budget_response = evaluate_customer_mock(
        budget_customer,
        PRODUCT,
    )

    premium_response = evaluate_customer_mock(
        premium_customer,
        PRODUCT,
    )

    assert (
        budget_response.purchase_intent
        != premium_response.purchase_intent
    )


def test_simulation_can_run_for_selected_customers():
    result = run_simulation(
        PRODUCT,
        customer_ids=["001", "011"],
        evaluator=evaluate_customer_mock,
    )

    assert result.total_customers == 2
    assert result.completed_customers == 2
    assert result.failed_customers == 0
    assert result.failed_customer_ids == []
    assert len(result.responses) == 2


def test_customer_ids_and_max_customers_cannot_be_combined():
    try:
        run_simulation(
            PRODUCT,
            customer_ids=["001"],
            max_customers=1,
            evaluator=evaluate_customer_mock,
        )
    except ValueError as error:
        assert (
            str(error)
            == "customer_ids and max_customers cannot be used together."
        )
    else:
        raise AssertionError(
            "Expected ValueError was not raised."
        )


def test_unknown_customer_id_is_rejected():
    try:
        run_simulation(
            PRODUCT,
            customer_ids=["999"],
            evaluator=evaluate_customer_mock,
        )
    except ValueError as error:
        assert "Unknown customer IDs" in str(error)
    else:
        raise AssertionError(
            "Expected ValueError was not raised."
        )


def fake_response(customer):
    return CustomerResponse(
        customer_id=customer.id,
        overall_interest=6,
        understanding=7,
        trust=5,
        price_acceptance=4,
        purchase_intent=3,
        would_buy=False,
        would_consider=True,
        primary_objection="Needs more information.",
        secondary_objection="Would compare alternatives.",
        positive_factors=["Relevant product"],
        negative_factors=["Needs more information"],
        questions=["What support is included?"],
        reasoning=(
            "This fake response is used to test retry behaviour."
        ),
    )


def test_mock_evaluator_is_the_safe_default(monkeypatch):
    monkeypatch.delenv("CUSTOMER_LAB_USE_MOCK", raising=False)

    assert get_default_evaluator() is evaluate_customer_mock


def test_gemini_retry_evaluator_is_used_when_mock_disabled(
    monkeypatch,
):
    monkeypatch.setenv("CUSTOMER_LAB_USE_MOCK", "false")

    assert get_default_evaluator() is evaluate_customer_with_retry


def test_quota_errors_fail_fast_without_retry(monkeypatch):
    customer = get_customer_by_id("001")

    assert customer is not None

    calls = {"count": 0}

    def boom(customer, product):
        calls["count"] += 1
        raise RuntimeError("429 rate limit")

    monkeypatch.setattr(
        simulation_module,
        "evaluate_customer",
        boom,
    )
    monkeypatch.setattr(
        simulation_module.time,
        "sleep",
        lambda seconds: None,
    )

    try:
        evaluate_customer_with_retry(customer, PRODUCT)
    except RuntimeError as error:
        assert "429" in str(error)
    else:
        raise AssertionError("Expected RuntimeError was not raised.")

    assert calls["count"] == 1


def test_transient_errors_are_retried_then_succeed(monkeypatch):
    customer = get_customer_by_id("001")

    assert customer is not None

    calls = {"count": 0}
    slept = []

    def flaky(customer, product):
        calls["count"] += 1

        if calls["count"] == 1:
            raise RuntimeError("temporary timeout")

        return fake_response(customer)

    monkeypatch.setattr(
        simulation_module,
        "evaluate_customer",
        flaky,
    )
    monkeypatch.setattr(
        simulation_module.time,
        "sleep",
        lambda seconds: slept.append(seconds),
    )

    response = evaluate_customer_with_retry(customer, PRODUCT)

    assert response.customer_id == customer.id
    assert calls["count"] == 2
    assert slept == [2]


def test_default_simulation_uses_mock_and_does_not_call_gemini(
    monkeypatch,
):
    monkeypatch.setenv("CUSTOMER_LAB_USE_MOCK", "true")

    def blocked_gemini_client():
        raise AssertionError("Gemini client was requested")

    monkeypatch.setattr(
        ai_module,
        "get_gemini_client",
        blocked_gemini_client,
    )

    assert use_mock_evaluator() is True
    assert get_default_evaluator() is evaluate_customer_mock

    result = run_simulation(
        PRODUCT,
        customer_ids=["001"],
    )

    assert result.total_customers == 1
    assert result.completed_customers == 1
    assert result.failed_customers == 0
    assert result.responses[0].customer_id == "001"


def test_injected_evaluator_is_used_instead_of_default():
    calls = []

    def injected(customer, product):
        calls.append(customer.id)
        return fake_response(customer)

    result = run_simulation(
        PRODUCT,
        customer_ids=["001", "011"],
        evaluator=injected,
    )

    assert sorted(calls) == ["001", "011"]
    assert result.total_customers == 2
    assert result.completed_customers == 2
    assert result.failed_customers == 0
    assert result.failed_customer_ids == []
    assert [
        response.customer_id for response in result.responses
    ] == ["001", "011"]


def test_failed_customer_is_isolated_from_the_rest():
    def mixed(customer, product):
        if customer.id == "001":
            raise ValueError("malformed AI response")

        return evaluate_customer_mock(customer, product)

    result = run_simulation(
        PRODUCT,
        customer_ids=["001", "011"],
        evaluator=mixed,
    )

    assert result.total_customers == 2
    assert result.completed_customers == 1
    assert result.failed_customers == 1
    assert result.failed_customer_ids == ["001"]
    assert len(result.responses) == 1
    assert result.responses[0].customer_id == "011"


def test_customer_id_mismatch_is_isolated_not_silently_accepted():
    def mismatched(customer, product):
        response = evaluate_customer_mock(customer, product)

        if customer.id == "001":
            return response.model_copy(
                update={"customer_id": "999"}
            )

        return response

    result = run_simulation(
        PRODUCT,
        customer_ids=["001", "011"],
        evaluator=mismatched,
    )

    assert result.total_customers == 2
    assert result.completed_customers == 1
    assert result.failed_customers == 1
    assert result.failed_customer_ids == ["001"]
    assert result.responses[0].customer_id == "011"


def test_invalid_evaluator_payload_does_not_crash_simulation():
    def mixed(customer, product):
        if customer.id == "001":
            return {
                "customer_id": customer.id,
                "purchase_intent": 3,
            }

        return evaluate_customer_mock(customer, product)

    result = run_simulation(
        PRODUCT,
        customer_ids=["001", "011"],
        evaluator=mixed,
    )

    assert result.total_customers == 2
    assert result.completed_customers == 1
    assert result.failed_customers == 1
    assert result.failed_customer_ids == ["001"]
    assert result.completed_customers + result.failed_customers == (
        result.total_customers
    )

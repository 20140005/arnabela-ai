from services.simulation_service import (
    evaluate_customer_mock,
    run_simulation,
)
from services.customer_service import get_customer_by_id
from models.test_input import ProductTestInput


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

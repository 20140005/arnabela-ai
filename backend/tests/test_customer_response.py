from pydantic import ValidationError

from models.customer_response import (
    CustomerResponse,
    ensure_response_for_customer,
)


VALID_RESPONSE = {
    "customer_id": "001",
    "overall_interest": 6,
    "understanding": 7,
    "trust": 5,
    "price_acceptance": 4,
    "purchase_intent": 3,
    "would_buy": False,
    "would_consider": True,
    "primary_objection": "I would want to compare the monthly cost.",
    "secondary_objection": "I have not seen independent reviews.",
    "positive_factors": ["It could save me admin time."],
    "negative_factors": ["The price needs a clearer payoff."],
    "questions": ["What evidence supports the claims?"],
    "reasoning": (
        "As this customer I like the time savings but I would "
        "not buy until I can compare alternatives."
    ),
}


def test_valid_customer_response_is_accepted():
    response = CustomerResponse.model_validate(VALID_RESPONSE)

    assert response.customer_id == "001"
    assert response.overall_interest == 6
    assert response.would_buy is False
    assert response.would_consider is True
    assert response.reasoning.startswith("As this customer")
    assert isinstance(response.positive_factors, list)
    assert isinstance(response.negative_factors, list)
    assert isinstance(response.questions, list)


def test_scores_outside_1_to_10_are_rejected():
    for field in (
        "overall_interest",
        "understanding",
        "trust",
        "price_acceptance",
        "purchase_intent",
    ):
        payload = dict(VALID_RESPONSE)
        payload[field] = 11

        try:
            CustomerResponse.model_validate(payload)
        except ValidationError:
            continue
        else:
            raise AssertionError(
                f"Expected ValidationError for {field}=11"
            )


def test_boolean_fields_reject_non_booleans():
    payload = dict(VALID_RESPONSE)
    payload["would_buy"] = "yes"

    try:
        CustomerResponse.model_validate(payload)
    except ValidationError as error:
        assert "would_buy" in str(error)
    else:
        raise AssertionError("Expected ValidationError was not raised.")


def test_missing_customer_id_is_rejected():
    payload = dict(VALID_RESPONSE)
    del payload["customer_id"]

    try:
        CustomerResponse.model_validate(payload)
    except ValidationError as error:
        assert "customer_id" in str(error)
    else:
        raise AssertionError("Expected ValidationError was not raised.")


def test_empty_objection_and_reasoning_are_rejected():
    for field in (
        "primary_objection",
        "secondary_objection",
        "reasoning",
    ):
        payload = dict(VALID_RESPONSE)
        payload[field] = "   "

        try:
            CustomerResponse.model_validate(payload)
        except ValidationError:
            continue
        else:
            raise AssertionError(
                f"Expected ValidationError for empty {field}"
            )


def test_factor_and_question_fields_must_be_arrays():
    payload = dict(VALID_RESPONSE)
    payload["questions"] = "What is the warranty?"

    try:
        CustomerResponse.model_validate(payload)
    except ValidationError as error:
        assert "questions" in str(error)
    else:
        raise AssertionError("Expected ValidationError was not raised.")


def test_ensure_response_rejects_customer_id_mismatch():
    response = CustomerResponse.model_validate(VALID_RESPONSE)

    try:
        ensure_response_for_customer(response, "002")
    except ValueError as error:
        assert "does not match evaluated customer '002'" in str(error)
        assert "'001'" in str(error)
    else:
        raise AssertionError("Expected ValueError was not raised.")


def test_ensure_response_rejects_non_response_objects():
    try:
        ensure_response_for_customer(
            {"customer_id": "001"},
            "001",
        )
    except TypeError as error:
        assert "expected CustomerResponse" in str(error)
    else:
        raise AssertionError("Expected TypeError was not raised.")

import json
from types import SimpleNamespace

from models.customer_response import CustomerResponse
from models.test_input import ProductTestInput
from services import ai_customer_service as ai_module
from services.ai_customer_service import (
    DEFAULT_GEMINI_MODEL,
    build_customer_prompt,
    evaluate_customer,
    get_gemini_client,
    get_gemini_model,
    is_quota_or_rate_limit_error,
)
from services.customer_service import get_customer_by_id


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


def valid_response_payload(customer_id="001"):
    return {
        "customer_id": customer_id,
        "overall_interest": 6,
        "understanding": 7,
        "trust": 5,
        "price_acceptance": 4,
        "purchase_intent": 3,
        "would_buy": False,
        "would_consider": True,
        "primary_objection": "I would want to compare the monthly cost.",
        "secondary_objection": "I have not seen independent reviews.",
        "positive_factors": [
            "It could save me admin time after jobs."
        ],
        "negative_factors": [
            "The price needs a clearer payoff for my income."
        ],
        "questions": [
            "What evidence shows it actually reduces admin time?"
        ],
        "reasoning": (
            "As an electrician who checks prices before buying "
            "tools or software, I like the time savings but I "
            "would not pay until I can compare alternatives."
        ),
    }


class FakeInteractions:
    def __init__(self, output_text="", error=None):
        self.output_text = output_text
        self.error = error
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)

        if self.error is not None:
            raise self.error

        return SimpleNamespace(output_text=self.output_text)


class FakeGeminiClient:
    def __init__(self, output_text="", error=None):
        self.interactions = FakeInteractions(
            output_text=output_text,
            error=error,
        )


def test_prompt_says_you_are_this_specific_simulated_customer():
    customer = get_customer_by_id("001")

    assert customer is not None

    prompt = build_customer_prompt(customer, PRODUCT)

    assert "You are this specific simulated customer." in prompt
    assert "You are NOT a business consultant." in prompt
    assert "give generic market research advice" in prompt
    assert 'describe what customers generally think' in prompt
    assert "invent facts" in prompt
    assert "claim this represents a real person" in prompt
    assert "population statistics" in prompt
    assert "ignore this customer's behavioural rules" in prompt
    assert "Distinguish overall_interest from purchase_intent." in prompt


def test_prompt_includes_the_supplied_customer_and_product():
    customer = get_customer_by_id("001")

    assert customer is not None

    prompt = build_customer_prompt(customer, PRODUCT)

    assert customer.id in prompt
    assert customer.name in prompt
    assert str(customer.age) in prompt
    assert customer.state in prompt
    assert customer.location in prompt
    assert customer.occupation in prompt
    assert customer.income_band in prompt
    assert customer.household in prompt
    assert customer.home_ownership in prompt
    assert customer.education in prompt
    assert str(customer.digital_literacy) in prompt
    assert str(customer.financial_behaviour.price_sensitivity) in prompt
    assert str(customer.financial_behaviour.willingness_to_finance) in prompt
    assert str(customer.financial_behaviour.impulse_buying) in prompt
    assert str(customer.personality.risk_tolerance) in prompt
    assert str(customer.personality.trust_requirement) in prompt
    assert str(customer.personality.research_tendency) in prompt
    assert str(customer.personality.brand_loyalty) in prompt
    assert "Reads reviews: yes" in prompt
    assert "Compares competitors: yes" in prompt
    assert "Checks prices: yes" in prompt
    assert "Prefers online shopping: yes" in prompt

    for motivation in customer.motivations:
        assert motivation in prompt

    for concern in customer.concerns:
        assert concern in prompt

    for rule in customer.behavioural_rules:
        assert rule in prompt

    assert PRODUCT.product_name in prompt
    assert PRODUCT.description in prompt
    assert PRODUCT.target_market in prompt

    for feature in PRODUCT.key_features:
        assert feature in prompt


def test_prompt_is_specific_to_the_supplied_customer():
    first = get_customer_by_id("001")
    second = get_customer_by_id("002")

    assert first is not None
    assert second is not None

    first_prompt = build_customer_prompt(first, PRODUCT)
    second_prompt = build_customer_prompt(second, PRODUCT)

    assert first.name in first_prompt
    assert first.name not in second_prompt
    assert second.occupation in second_prompt
    assert first.occupation not in second_prompt


def test_gemini_model_defaults_and_can_be_overridden(monkeypatch):
    monkeypatch.delenv("GEMINI_MODEL", raising=False)

    assert get_gemini_model() == DEFAULT_GEMINI_MODEL
    assert DEFAULT_GEMINI_MODEL == "gemini-3.6-flash"

    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.6-flash")
    assert get_gemini_model() == "gemini-3.6-flash"

    monkeypatch.setenv("GEMINI_MODEL", "gemini-test-model")
    assert get_gemini_model() == "gemini-test-model"


def test_missing_api_key_raises_useful_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(ai_module, "_gemini_client", None)

    try:
        get_gemini_client()
    except RuntimeError as error:
        message = str(error)
        assert "GEMINI_API_KEY is not set" in message
        assert "CUSTOMER_LAB_USE_MOCK=true" in message
    else:
        raise AssertionError("Expected RuntimeError was not raised.")


def test_evaluate_customer_uses_fake_gemini_and_profile_prompt(
    monkeypatch,
):
    customer = get_customer_by_id("002")

    assert customer is not None

    fake_client = FakeGeminiClient(
        output_text=json.dumps(valid_response_payload(customer.id))
    )

    monkeypatch.setenv("GEMINI_MODEL", "gemini-test-model")
    monkeypatch.setattr(
        ai_module,
        "get_gemini_client",
        lambda: fake_client,
    )

    response = evaluate_customer(customer, PRODUCT)

    assert isinstance(response, CustomerResponse)
    assert response.customer_id == customer.id
    assert len(fake_client.interactions.calls) == 1

    call = fake_client.interactions.calls[0]

    assert call["model"] == "gemini-test-model"
    assert "You are this specific simulated customer." in call["input"]
    assert customer.occupation in call["input"]
    assert PRODUCT.product_name in call["input"]
    assert call["response_format"]["schema"] == (
        CustomerResponse.model_json_schema()
    )


def test_evaluate_customer_corrects_customer_id(monkeypatch):
    customer = get_customer_by_id("001")

    assert customer is not None

    fake_client = FakeGeminiClient(
        output_text=json.dumps(valid_response_payload("999"))
    )
    monkeypatch.setattr(
        ai_module,
        "get_gemini_client",
        lambda: fake_client,
    )

    response = evaluate_customer(customer, PRODUCT)

    assert response.customer_id == customer.id


def test_evaluate_customer_accepts_fenced_json(monkeypatch):
    customer = get_customer_by_id("001")

    assert customer is not None

    payload = json.dumps(valid_response_payload(customer.id))
    fake_client = FakeGeminiClient(
        output_text=f"```json\n{payload}\n```"
    )
    monkeypatch.setattr(
        ai_module,
        "get_gemini_client",
        lambda: fake_client,
    )

    response = evaluate_customer(customer, PRODUCT)

    assert response.customer_id == customer.id
    assert response.purchase_intent == 3


def test_quota_errors_are_marked_for_fail_fast():
    class QuotaError(Exception):
        def __init__(self):
            self.code = 429
            self.status = "RESOURCE_EXHAUSTED"
            super().__init__("quota exceeded")

    assert is_quota_or_rate_limit_error(QuotaError())
    assert is_quota_or_rate_limit_error(
        RuntimeError("429 rate limit")
    )
    assert not is_quota_or_rate_limit_error(
        RuntimeError("temporary timeout")
    )


def test_gemini_errors_do_not_expose_api_key(monkeypatch):
    customer = get_customer_by_id("001")

    assert customer is not None

    fake_key = "secret-test-key-abc"
    monkeypatch.setenv("GEMINI_API_KEY", fake_key)

    class BoomInteractions:
        def create(self, **kwargs):
            raise RuntimeError(
                f"upstream failed for key {fake_key}"
            )

    fake_client = SimpleNamespace(
        interactions=BoomInteractions()
    )
    monkeypatch.setattr(
        ai_module,
        "get_gemini_client",
        lambda: fake_client,
    )

    try:
        evaluate_customer(customer, PRODUCT)
    except RuntimeError as error:
        message = str(error)
        assert fake_key not in message
        assert "[REDACTED]" in message
        assert "Gemini evaluation failed" in message
    else:
        raise AssertionError("Expected RuntimeError was not raised.")


def test_evaluate_customer_marks_quota_errors(monkeypatch):
    customer = get_customer_by_id("001")

    assert customer is not None

    class QuotaError(Exception):
        def __init__(self):
            self.code = 429
            self.status = "RESOURCE_EXHAUSTED"
            super().__init__("quota exceeded")

    fake_client = FakeGeminiClient(error=QuotaError())
    monkeypatch.setattr(
        ai_module,
        "get_gemini_client",
        lambda: fake_client,
    )

    try:
        evaluate_customer(customer, PRODUCT)
    except RuntimeError as error:
        assert "quota/rate-limit error (429)" in str(error)
    else:
        raise AssertionError("Expected RuntimeError was not raised.")

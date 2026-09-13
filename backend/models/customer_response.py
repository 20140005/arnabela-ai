from pydantic import BaseModel, Field, field_validator


SCORE_FIELDS = (
    "overall_interest",
    "understanding",
    "trust",
    "price_acceptance",
    "purchase_intent",
)

REQUIRED_TEXT_FIELDS = (
    "customer_id",
    "primary_objection",
    "secondary_objection",
    "reasoning",
)

ARRAY_FIELDS = (
    "positive_factors",
    "negative_factors",
    "questions",
)


class CustomerResponse(BaseModel):
    customer_id: str = Field(min_length=1)

    overall_interest: int = Field(ge=1, le=10)
    understanding: int = Field(ge=1, le=10)
    trust: int = Field(ge=1, le=10)
    price_acceptance: int = Field(ge=1, le=10)
    purchase_intent: int = Field(ge=1, le=10)

    would_buy: bool
    would_consider: bool

    primary_objection: str = Field(min_length=1)
    secondary_objection: str = Field(min_length=1)

    positive_factors: list[str]
    negative_factors: list[str]
    questions: list[str]

    reasoning: str = Field(min_length=1)

    @field_validator(*SCORE_FIELDS, mode="before")
    @classmethod
    def require_score_1_to_10(cls, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("must be an integer from 1 to 10")

        if isinstance(value, float) and not value.is_integer():
            raise ValueError("must be an integer from 1 to 10")

        score = int(value)

        if score < 1 or score > 10:
            raise ValueError("must be an integer from 1 to 10")

        return score

    @field_validator("would_buy", "would_consider", mode="before")
    @classmethod
    def require_actual_boolean(cls, value):
        if isinstance(value, bool):
            return value

        raise ValueError("must be a boolean true or false")

    @field_validator(*REQUIRED_TEXT_FIELDS, mode="before")
    @classmethod
    def require_non_empty_string(cls, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("must be a non-empty string")

        return value.strip()

    @field_validator(*ARRAY_FIELDS, mode="before")
    @classmethod
    def require_string_array(cls, value):
        if not isinstance(value, list):
            raise ValueError("must be an array of strings")

        if not all(isinstance(item, str) for item in value):
            raise ValueError("must be an array of strings")

        return value


def ensure_response_for_customer(
    response: object,
    customer_id: str,
) -> CustomerResponse:
    if not isinstance(response, CustomerResponse):
        raise TypeError(
            "Evaluator returned "
            f"{type(response).__name__}, expected CustomerResponse."
        )

    if response.customer_id != customer_id:
        raise ValueError(
            "Response customer_id "
            f"{response.customer_id!r} does not match evaluated "
            f"customer {customer_id!r}."
        )

    return response

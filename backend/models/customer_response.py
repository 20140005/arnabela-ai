from pydantic import BaseModel, Field


class CustomerResponse(BaseModel):
    customer_id: str

    overall_interest: int = Field(ge=1, le=10)
    understanding: int = Field(ge=1, le=10)
    trust: int = Field(ge=1, le=10)
    price_acceptance: int = Field(ge=1, le=10)
    purchase_intent: int = Field(ge=1, le=10)

    would_buy: bool
    would_consider: bool

    primary_objection: str
    secondary_objection: str

    positive_factors: list[str]
    negative_factors: list[str]
    questions: list[str]

    reasoning: str
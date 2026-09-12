from pydantic import BaseModel, Field
from typing import List


class FinancialBehaviour(BaseModel):
    price_sensitivity: int = Field(ge=1, le=10)
    willingness_to_finance: int = Field(ge=1, le=10)
    impulse_buying: int = Field(ge=1, le=10)


class Personality(BaseModel):
    risk_tolerance: int = Field(ge=1, le=10)
    trust_requirement: int = Field(ge=1, le=10)
    research_tendency: int = Field(ge=1, le=10)
    brand_loyalty: int = Field(ge=1, le=10)


class ShoppingBehaviour(BaseModel):
    reads_reviews: bool
    compares_competitors: bool
    checks_prices: bool
    prefers_online_shopping: bool


class CustomerProfile(BaseModel):
    id: str
    name: str
    age: int
    state: str
    location: str
    occupation: str
    income_band: str
    household: str
    home_ownership: str
    education: str
    digital_literacy: int = Field(ge=1, le=10)

    financial_behaviour: FinancialBehaviour
    personality: Personality
    shopping_behaviour: ShoppingBehaviour

    motivations: List[str]
    concerns: List[str]
    behavioural_rules: List[str]
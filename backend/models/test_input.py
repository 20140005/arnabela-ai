from pydantic import BaseModel, Field


class ProductTestInput(BaseModel):
    product_name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    price: float = Field(ge=0)
    key_features: list[str] = Field(default_factory=list)
    target_market: str = Field(min_length=1)
    # Optional: retest the same audience (Versus / comparison).
    customer_ids: list[str] | None = None

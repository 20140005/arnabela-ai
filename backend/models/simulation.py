from pydantic import BaseModel, Field

from models.customer_response import CustomerResponse


class SimulationResult(BaseModel):
    test_id: str
    total_customers: int = Field(ge=0)
    completed_customers: int = Field(ge=0)
    failed_customers: int = Field(ge=0)
    failed_customer_ids: list[str]
    responses: list[CustomerResponse]
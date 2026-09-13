from typing import Literal

from pydantic import BaseModel, Field

from models.simulation import SimulationResult


CustomerSimulationState = Literal[
    "WAITING",
    "EVALUATING",
    "BUY",
    "CONSIDER",
    "REJECT",
    "FAILED",
]

SimulationJobStatusValue = Literal[
    "queued",
    "running",
    "completed",
    "failed",
]


class CustomerProgress(BaseModel):
    customer_id: str
    name: str
    state: CustomerSimulationState


class SimulationJobStatus(BaseModel):
    job_id: str
    status: SimulationJobStatusValue
    total_customers: int = Field(ge=0)
    completed_customers: int = Field(ge=0)
    failed_customers: int = Field(ge=0)
    buy_count: int = Field(ge=0)
    consider_count: int = Field(ge=0)
    reject_count: int = Field(ge=0)
    customers: list[CustomerProgress]
    result: SimulationResult | None = None
    error: str | None = None

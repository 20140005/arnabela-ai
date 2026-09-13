from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field

from models.customer import CustomerProfile
from models.customer_response import CustomerResponse
from models.simulation import SimulationResult
from models.simulation_job import (
    CustomerProgress,
    CustomerSimulationState,
    SimulationJobStatus,
    SimulationJobStatusValue,
)
from models.test_input import ProductTestInput
from services.ai_customer_service import redact_secrets
from services.simulation_service import (
    CustomerEvaluator,
    resolve_simulation_customers,
    run_simulation,
)


@dataclass
class SimulationJobRecord:
    job_id: str
    status: SimulationJobStatusValue
    progress_by_id: dict[str, CustomerProgress]
    customer_order: list[str]
    result: SimulationResult | None = None
    error: str | None = None
    thread: threading.Thread | None = None
    lock: threading.Lock = field(default_factory=threading.Lock)


_jobs: dict[str, SimulationJobRecord] = {}
_jobs_lock = threading.Lock()


def reset_simulation_jobs() -> None:
    with _jobs_lock:
        _jobs.clear()


def decision_state_from_response(
    response: CustomerResponse,
) -> CustomerSimulationState:
    if response.would_buy:
        return "BUY"

    if response.would_consider:
        return "CONSIDER"

    return "REJECT"


def _snapshot(record: SimulationJobRecord) -> SimulationJobStatus:
    customers = [
        record.progress_by_id[customer_id].model_copy()
        for customer_id in record.customer_order
    ]

    buy_count = sum(
        1 for customer in customers if customer.state == "BUY"
    )
    consider_count = sum(
        1 for customer in customers if customer.state == "CONSIDER"
    )
    reject_count = sum(
        1 for customer in customers if customer.state == "REJECT"
    )
    failed_customers = sum(
        1 for customer in customers if customer.state == "FAILED"
    )

    return SimulationJobStatus(
        job_id=record.job_id,
        status=record.status,
        total_customers=len(customers),
        completed_customers=buy_count + consider_count + reject_count,
        failed_customers=failed_customers,
        buy_count=buy_count,
        consider_count=consider_count,
        reject_count=reject_count,
        customers=customers,
        result=record.result,
        error=record.error,
    )


def get_simulation_job(job_id: str) -> SimulationJobStatus | None:
    with _jobs_lock:
        record = _jobs.get(job_id)

    if record is None:
        return None

    with record.lock:
        return _snapshot(record)


def create_simulation_job(
    product: ProductTestInput,
    customer_ids: list[str] | None = None,
    max_customers: int | None = None,
    evaluator: CustomerEvaluator | None = None,
) -> SimulationJobStatus:
    customers = resolve_simulation_customers(
        customer_ids=customer_ids,
        max_customers=max_customers,
    )

    job_id = str(uuid.uuid4())

    progress_by_id = {
        customer.id: CustomerProgress(
            customer_id=customer.id,
            name=customer.name,
            state="WAITING",
        )
        for customer in customers
    }

    record = SimulationJobRecord(
        job_id=job_id,
        status="queued",
        progress_by_id=progress_by_id,
        customer_order=[customer.id for customer in customers],
    )

    with _jobs_lock:
        _jobs[job_id] = record

    thread = threading.Thread(
        target=_run_simulation_job,
        args=(job_id, product, evaluator),
        daemon=True,
    )
    record.thread = thread
    thread.start()

    with record.lock:
        return _snapshot(record)


def _set_customer_state(
    record: SimulationJobRecord,
    customer_id: str,
    state: CustomerSimulationState,
) -> None:
    with record.lock:
        progress = record.progress_by_id[customer_id]
        record.progress_by_id[customer_id] = progress.model_copy(
            update={"state": state}
        )


def _run_simulation_job(
    job_id: str,
    product: ProductTestInput,
    evaluator: CustomerEvaluator | None,
) -> None:
    with _jobs_lock:
        record = _jobs[job_id]

    with record.lock:
        record.status = "running"

    customer_ids = list(record.customer_order)

    def on_customer_start(customer: CustomerProfile) -> None:
        _set_customer_state(record, customer.id, "EVALUATING")

    def on_customer_finish(
        customer: CustomerProfile,
        response: CustomerResponse | None,
    ) -> None:
        if response is None:
            _set_customer_state(record, customer.id, "FAILED")
            return

        _set_customer_state(
            record,
            customer.id,
            decision_state_from_response(response),
        )

    try:
        result = run_simulation(
            product,
            customer_ids=customer_ids,
            evaluator=evaluator,
            on_customer_start=on_customer_start,
            on_customer_finish=on_customer_finish,
        )
    except Exception as error:
        with record.lock:
            record.status = "failed"
            record.error = redact_secrets(str(error))
        return

    with record.lock:
        record.result = result
        record.status = "completed"
        record.error = None

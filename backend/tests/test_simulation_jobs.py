import threading
import time

from fastapi.testclient import TestClient

from main import app
from models.customer_response import CustomerResponse
from models.test_input import ProductTestInput
from services.simulation_job_service import (
    create_simulation_job,
    get_simulation_job,
)
from services.simulation_service import evaluate_customer_mock


client = TestClient(app)

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
    ],
    target_market="Australian tradespeople",
)


def fake_response(customer, would_buy=True, would_consider=False):
    return CustomerResponse(
        customer_id=customer.id,
        overall_interest=7,
        understanding=8,
        trust=7,
        price_acceptance=6,
        purchase_intent=8 if would_buy else 4,
        would_buy=would_buy,
        would_consider=would_consider,
        primary_objection="Needs more information.",
        secondary_objection="Would compare alternatives.",
        positive_factors=["Relevant product"],
        negative_factors=["Needs more information"],
        questions=["What support is included?"],
        reasoning=(
            "This fake response is used to test "
            "simulation job progress."
        ),
    )


def wait_for_job(job_id: str, timeout: float = 5.0):
    deadline = time.time() + timeout

    while time.time() < deadline:
        job = get_simulation_job(job_id)

        assert job is not None

        if job.status in ("completed", "failed"):
            return job

        time.sleep(0.01)

    raise AssertionError(
        f"Simulation job {job_id} did not finish in time."
    )


def test_create_simulation_job_starts_with_customer_progress():
    started = threading.Event()
    release = threading.Event()

    def blocked_evaluator(customer, product):
        started.set()
        assert release.wait(timeout=2)
        return fake_response(customer)

    job = create_simulation_job(
        PRODUCT,
        customer_ids=["001"],
        evaluator=blocked_evaluator,
    )

    assert job.job_id
    assert job.total_customers == 1
    assert job.customers[0].customer_id == "001"
    assert job.customers[0].state in ("WAITING", "EVALUATING")
    assert job.result is None

    assert started.wait(timeout=2)

    progress = get_simulation_job(job.job_id)

    assert progress is not None
    assert progress.status == "running"
    assert progress.customers[0].state == "EVALUATING"
    assert progress.completed_customers == 0
    assert progress.buy_count == 0

    release.set()

    completed = wait_for_job(job.job_id)

    assert completed.status == "completed"
    assert completed.customers[0].state == "BUY"
    assert completed.completed_customers == 1
    assert completed.buy_count == 1
    assert completed.failed_customers == 0
    assert completed.result is not None
    assert completed.result.responses[0].customer_id == "001"


def test_simulation_job_records_failed_customers():
    def mixed_evaluator(customer, product):
        if customer.id == "001":
            raise ValueError("malformed AI response")

        return fake_response(
            customer,
            would_buy=False,
            would_consider=True,
        )

    job = create_simulation_job(
        PRODUCT,
        customer_ids=["001", "011"],
        evaluator=mixed_evaluator,
    )

    completed = wait_for_job(job.job_id)

    states = {
        item.customer_id: item.state
        for item in completed.customers
    }

    assert completed.status == "completed"
    assert states["001"] == "FAILED"
    assert states["011"] == "CONSIDER"
    assert completed.failed_customers == 1
    assert completed.completed_customers == 1
    assert completed.consider_count == 1
    assert completed.result is not None
    assert completed.result.failed_customer_ids == ["001"]
    assert [
        response.customer_id
        for response in completed.result.responses
    ] == ["011"]


def test_simulation_job_completion_uses_actual_decisions():
    job = create_simulation_job(
        PRODUCT,
        customer_ids=["001", "011"],
        evaluator=evaluate_customer_mock,
    )

    completed = wait_for_job(job.job_id)

    assert completed.status == "completed"
    assert completed.total_customers == 2
    assert (
        completed.completed_customers
        + completed.failed_customers
        == 2
    )
    assert completed.result is not None
    assert completed.result.completed_customers == (
        completed.completed_customers
    )

    for item in completed.customers:
        assert item.state in (
            "BUY",
            "CONSIDER",
            "REJECT",
            "FAILED",
        )

        if item.state != "FAILED":
            response = next(
                result
                for result in completed.result.responses
                if result.customer_id == item.customer_id
            )

            if response.would_buy:
                assert item.state == "BUY"
            elif response.would_consider:
                assert item.state == "CONSIDER"
            else:
                assert item.state == "REJECT"


def test_unknown_simulation_job_is_not_found():
    response = client.get(
        "/simulation-jobs/missing-job"
    )

    assert response.status_code == 404


def test_create_simulation_job_api_completes():
    create_response = client.post(
        "/simulation-jobs",
        json={
            "product_name": "AI Field Service Assistant",
            "description": (
                "An AI assistant for Australian tradespeople "
                "that reduces administrative work."
            ),
            "price": 199,
            "key_features": [
                "Voice-to-job-note conversion",
            ],
            "target_market": (
                "Australian electricians, plumbers and builders"
            ),
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()

    assert created["job_id"]
    assert created["total_customers"] == 100
    assert len(created["customers"]) == 100
    assert created["status"] in (
        "queued",
        "running",
        "completed",
    )

    deadline = time.time() + 10

    while time.time() < deadline:
        progress_response = client.get(
            f"/simulation-jobs/{created['job_id']}"
        )

        assert progress_response.status_code == 200

        progress = progress_response.json()

        if progress["status"] == "completed":
            assert progress["result"] is not None
            assert progress["result"]["total_customers"] == 100
            assert (
                progress["completed_customers"]
                + progress["failed_customers"]
                == 100
            )
            assert len(progress["result"]["responses"]) == (
                progress["completed_customers"]
            )
            return

        if progress["status"] == "failed":
            raise AssertionError(
                f"Simulation job failed: {progress['error']}"
            )

        time.sleep(0.02)

    raise AssertionError(
        "API simulation job did not complete in time."
    )

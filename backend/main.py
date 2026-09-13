from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.simulation import SimulationResult
from models.simulation_job import SimulationJobStatus
from models.test_input import ProductTestInput
from services.customer_service import (
    get_all_customers,
    get_customer_by_id,
)
from services.simulation_job_service import (
    create_simulation_job,
    get_simulation_job,
)
from services.simulation_service import run_simulation


app = FastAPI(
    title="Customer Lab API",
    description="AI-powered customer simulation platform",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Welcome to Customer Lab API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/customers")
def get_customers():
    customers = get_all_customers()

    return {
        "count": len(customers),
        "customers": customers,
    }


@app.get("/customers/{customer_id}")
def get_customer(customer_id: str):
    customer = get_customer_by_id(customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{customer_id}' not found.",
        )

    return customer


@app.post("/simulations", response_model=SimulationResult)
def create_simulation(product: ProductTestInput):
    return run_simulation(product)


@app.post("/simulation-jobs", response_model=SimulationJobStatus)
def start_simulation_job(product: ProductTestInput):
    return create_simulation_job(product)


@app.get(
    "/simulation-jobs/{job_id}",
    response_model=SimulationJobStatus,
)
def read_simulation_job(job_id: str):
    job = get_simulation_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail=f"Simulation job '{job_id}' not found.",
        )

    return job
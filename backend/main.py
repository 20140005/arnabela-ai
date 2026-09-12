from fastapi import FastAPI, HTTPException

from models.simulation import SimulationResult
from models.test_input import ProductTestInput
from services.customer_service import (
    get_all_customers,
    get_customer_by_id,
)
from services.simulation_service import run_simulation


app = FastAPI(
    title="Customer Lab API",
    description="AI-powered customer simulation platform",
    version="0.1.0",
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
from fastapi import FastAPI, HTTPException

from services.customer_service import (
    get_all_customers,
    get_customer_by_id,
)


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
    """
    Return all 100 Customer Lab customer profiles.
    """

    customers = get_all_customers()

    return {
        "count": len(customers),
        "customers": customers,
    }


@app.get("/customers/{customer_id}")
def get_customer(customer_id: str):
    """
    Return one customer by ID.
    """

    customer = get_customer_by_id(customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{customer_id}' not found.",
        )

    return customer
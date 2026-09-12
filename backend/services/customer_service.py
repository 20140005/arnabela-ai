import json
from pathlib import Path

from models.customer import CustomerProfile


# customer_service.py
# Responsible for loading and accessing the Customer Lab
# synthetic customer population.


CUSTOMER_DATA_FILE = (
    Path(__file__).resolve().parents[2]
    / "customer_data"
    / "customers.json"
)


def load_customers() -> list[CustomerProfile]:
    """
    Load all customer profiles from customers.json.
    """

    if not CUSTOMER_DATA_FILE.exists():
        raise FileNotFoundError(
            f"Customer data file not found: {CUSTOMER_DATA_FILE}"
        )

    with CUSTOMER_DATA_FILE.open("r", encoding="utf-8") as file:
        raw_customers = json.load(file)

    return [
        CustomerProfile.model_validate(customer)
        for customer in raw_customers
    ]


def get_all_customers() -> list[CustomerProfile]:
    """
    Return all customer profiles.
    """

    return load_customers()


def get_customer_by_id(customer_id: str) -> CustomerProfile | None:
    """
    Return a customer by ID.

    Returns None if the customer does not exist.
    """

    customers = load_customers()

    for customer in customers:
        if customer.id == customer_id:
            return customer

    return None
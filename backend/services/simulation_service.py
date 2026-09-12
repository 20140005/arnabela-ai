import time
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed

from models.customer import CustomerProfile
from models.customer_response import CustomerResponse
from models.simulation import SimulationResult
from models.test_input import ProductTestInput
from services.ai_customer_service import evaluate_customer
from services.customer_service import get_all_customers


MAX_CONCURRENT_CUSTOMERS = 5
MAX_RETRIES = 2
RETRY_DELAYS = [2, 5]


CustomerEvaluator = Callable[
    [CustomerProfile, ProductTestInput],
    CustomerResponse,
]


def evaluate_customer_with_retry(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> CustomerResponse:
    last_error = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            return evaluate_customer(customer, product)

        except Exception as error:
            last_error = error

            if attempt >= MAX_RETRIES:
                break

            time.sleep(RETRY_DELAYS[attempt])

    raise last_error


def run_simulation(
    product: ProductTestInput,
    customer_ids: list[str] | None = None,
    max_customers: int | None = None,
    evaluator: CustomerEvaluator | None = None,
) -> SimulationResult:
    if evaluator is None:
        evaluator = evaluate_customer_with_retry

    all_customers = get_all_customers()

    if customer_ids is not None and max_customers is not None:
        raise ValueError(
            "customer_ids and max_customers cannot be used together."
        )

    if customer_ids is not None:
        requested_ids = set(customer_ids)

        customers_by_id = {
            customer.id: customer
            for customer in all_customers
        }

        missing_ids = requested_ids - customers_by_id.keys()

        if missing_ids:
            raise ValueError(
                "Unknown customer IDs: "
                + ", ".join(sorted(missing_ids))
            )

        customers = [
            customer
            for customer in all_customers
            if customer.id in requested_ids
        ]

    else:
        customers = all_customers

        if max_customers is not None:
            if max_customers < 1:
                raise ValueError(
                    "max_customers must be at least 1."
                )

            customers = customers[:max_customers]

    responses_by_customer_id: dict[str, CustomerResponse] = {}
    failed_customer_ids: list[str] = []

    with ThreadPoolExecutor(
        max_workers=MAX_CONCURRENT_CUSTOMERS
    ) as executor:

        future_to_customer = {
            executor.submit(
                evaluator,
                customer,
                product,
            ): customer
            for customer in customers
        }

        for future in as_completed(future_to_customer):
            customer = future_to_customer[future]

            try:
                response = future.result()
                responses_by_customer_id[customer.id] = response

            except Exception as error:
                print(
                    f"Customer {customer.id} failed: {error}"
                )
                failed_customer_ids.append(customer.id)

    responses = [
        responses_by_customer_id[customer.id]
        for customer in customers
        if customer.id in responses_by_customer_id
    ]

    return SimulationResult(
        test_id=str(uuid.uuid4()),
        total_customers=len(customers),
        completed_customers=len(responses),
        failed_customers=len(failed_customer_ids),
        failed_customer_ids=sorted(failed_customer_ids),
        responses=responses,
    )
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
USE_MOCK_EVALUATOR = True

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

            error_text = str(error).lower()

            is_quota_error = (
                "429" in error_text
                or "quota exceeded" in error_text
                or "rate limit" in error_text
                or "too many requests" in error_text
            )

            if is_quota_error:
                raise

            if attempt >= MAX_RETRIES:
                break

            time.sleep(RETRY_DELAYS[attempt])

    raise last_error

def evaluate_customer_mock(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> CustomerResponse:
    archetype_scores = {
        "Budget-Focused Buyer": {
            "interest": 4,
            "purchase": 3,
            "price": 3,
        },
        "Premium Value Buyer": {
            "interest": 7,
            "purchase": 6,
            "price": 7,
        },
        "Tech Enthusiast": {
            "interest": 9,
            "purchase": 8,
            "price": 8,
        },
        "Risk-Averse Researcher": {
            "interest": 5,
            "purchase": 3,
            "price": 5,
        },
        "Convenience-First Buyer": {
            "interest": 8,
            "purchase": 7,
            "price": 7,
        },
        "Family-Focused Buyer": {
            "interest": 6,
            "purchase": 5,
            "price": 5,
        },
        "Sustainability-Focused Buyer": {
            "interest": 8,
            "purchase": 7,
            "price": 7,
        },
        "Brand-Loyal Buyer": {
            "interest": 5,
            "purchase": 4,
            "price": 5,
        },
        "Impulse Early Adopter": {
            "interest": 8,
            "purchase": 7,
            "price": 8,
        },
        "Practical Skeptical Buyer": {
            "interest": 5,
            "purchase": 3,
            "price": 4,
        },
    }

    scores = archetype_scores.get(
        customer.archetype,
        {
            "interest": 5,
            "purchase": 4,
            "price": 5,
        },
    )

    purchase_intent = scores["purchase"]

    would_buy = purchase_intent >= 7
    would_consider = (
        not would_buy
        and purchase_intent >= 4
    )

    if customer.financial_behaviour.price_sensitivity >= 8:
        primary_objection = "Price feels too high"
    elif customer.personality.risk_tolerance <= 4:
        primary_objection = (
            "Need proof it actually works"
        )
    elif customer.shopping_behaviour.compares_competitors:
        primary_objection = (
            "Would compare alternatives"
        )
    else:
        primary_objection = (
            "Needs more information"
        )

    return CustomerResponse(
        customer_id=customer.id,
        overall_interest=scores["interest"],
        understanding=7,
        trust=7,
        price_acceptance=scores["price"],
        purchase_intent=purchase_intent,
        would_buy=would_buy,
        would_consider=would_consider,
        primary_objection=primary_objection,
        secondary_objection=(
            "Would want more information before purchasing"
        ),
        positive_factors=[
            product.key_features[0]
            if product.key_features
            else "Clear product value",
            "Relevant to the customer's needs",
        ],
        negative_factors=[
            primary_objection,
        ],
        questions=[
            "What evidence supports the product's claims?"
        ],
        reasoning=(
            f"This is a simulated response from the "
            f"{customer.archetype} customer archetype. "
            f"The response is based on the customer's "
            f"behavioural profile and the supplied product."
        ),
    )

def run_simulation(
    product: ProductTestInput,
    customer_ids: list[str] | None = None,
    max_customers: int | None = None,
    evaluator: CustomerEvaluator | None = None,
) -> SimulationResult:
    if evaluator is None:
        evaluator = (
            evaluate_customer_mock
            if USE_MOCK_EVALUATOR
            else evaluate_customer_with_retry
        )

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
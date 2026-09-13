import hashlib
import os
import time
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed

from models.customer import CustomerProfile
from models.customer_response import (
    CustomerResponse,
    ensure_response_for_customer,
)
from models.simulation import SimulationResult
from models.test_input import ProductTestInput
from services.ai_customer_service import (
    evaluate_customer,
    is_quota_or_rate_limit_error,
    redact_secrets,
)
from services.customer_service import get_all_customers


MAX_CONCURRENT_CUSTOMERS = 5
MAX_RETRIES = 2
RETRY_DELAYS = [2, 5]

# CUSTOMER_LAB_USE_MOCK=true (default) uses evaluate_customer_mock
# and never calls Gemini. Set CUSTOMER_LAB_USE_MOCK=false to use
# evaluate_customer_with_retry -> Gemini. Injected evaluators
# bypass both.


CustomerEvaluator = Callable[
    [CustomerProfile, ProductTestInput],
    CustomerResponse,
]


ARCHETYPE_BASE_SCORES = {
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

            if is_quota_or_rate_limit_error(error):
                raise

            if attempt >= MAX_RETRIES:
                break

            time.sleep(RETRY_DELAYS[attempt])

    raise last_error


def stable_variation(
    customer_id: str,
    product_name: str,
    amount: int,
) -> int:
    """
    Generate a deterministic variation based on the customer
    and product.

    The same customer/product combination always produces
    the same value.
    """

    if amount <= 0:
        return 0

    seed = f"{customer_id}:{product_name}".encode("utf-8")

    digest = hashlib.sha256(seed).hexdigest()

    return (
        int(digest[:8], 16) % (amount * 2 + 1)
    ) - amount


def clamp_score(value: float) -> int:
    return max(1, min(10, round(value)))


def calculate_target_relevance(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> int:
    text = (
        f"{product.product_name} "
        f"{product.description} "
        f"{product.target_market} "
        f"{' '.join(product.key_features)}"
    ).lower()

    relevance = 0

    occupation = customer.occupation.lower()
    location = customer.location.lower()
    archetype = customer.archetype.lower()

    if any(
        word in text
        for word in occupation.split()
        if len(word) >= 5
    ):
        relevance += 2

    if any(
        word in text
        for word in [
            "australia",
            customer.state.lower(),
            location,
        ]
    ):
        relevance += 1

    archetype_keywords = {
        "budget": [
            "affordable",
            "save",
            "saving",
            "low cost",
            "value",
            "cheap",
        ],
        "premium": [
            "premium",
            "high-end",
            "quality",
            "luxury",
            "performance",
        ],
        "tech": [
            "ai",
            "automation",
            "software",
            "smart",
            "technology",
            "digital",
        ],
        "risk": [
            "warranty",
            "guarantee",
            "secure",
            "reliable",
            "proven",
        ],
        "convenience": [
            "automatic",
            "easy",
            "simple",
            "convenient",
            "time",
        ],
        "family": [
            "family",
            "children",
            "household",
            "home",
            "safety",
        ],
        "sustainability": [
            "solar",
            "energy",
            "sustainable",
            "environment",
            "renewable",
            "green",
        ],
        "brand": [
            "trusted",
            "brand",
            "established",
            "reputation",
        ],
        "impulse": [
            "new",
            "latest",
            "launch",
            "innovation",
            "first",
        ],
        "practical": [
            "durable",
            "reliable",
            "practical",
            "simple",
            "efficient",
        ],
    }

    for keyword in archetype_keywords:
        if keyword in archetype:
            if any(
                phrase in text
                for phrase in archetype_keywords[keyword]
            ):
                relevance += 2

    return min(relevance, 5)


def calculate_price_effect(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> int:
    price = product.price

    if price <= 0:
        return 2

    sensitivity = customer.financial_behaviour.price_sensitivity

    if price < 100:
        base_effect = 1
    elif price < 500:
        base_effect = 0
    elif price < 2000:
        base_effect = -1
    elif price < 5000:
        base_effect = -2
    elif price < 10000:
        base_effect = -3
    else:
        base_effect = -4

    if sensitivity >= 8:
        base_effect -= 1
    elif sensitivity <= 3:
        base_effect += 1

    return max(-5, min(2, base_effect))


def calculate_trust_effect(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> int:
    text = (
        f"{product.description} "
        f"{' '.join(product.key_features)}"
    ).lower()

    effect = 0

    trust_signals = [
        "warranty",
        "guarantee",
        "certified",
        "secure",
        "tested",
        "proven",
        "support",
        "trial",
    ]

    for signal in trust_signals:
        if signal in text:
            effect += 1

    if customer.personality.trust_requirement >= 8:
        if effect == 0:
            return -2

        return min(effect, 2)

    if customer.personality.trust_requirement <= 3:
        return min(effect, 1)

    return min(effect, 2)


def calculate_digital_fit(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> int:
    text = (
        f"{product.description} "
        f"{' '.join(product.key_features)}"
    ).lower()

    digital_keywords = [
        "app",
        "software",
        "online",
        "digital",
        "ai",
        "automation",
        "mobile",
        "smart",
        "platform",
    ]

    digital_product = any(
        keyword in text
        for keyword in digital_keywords
    )

    if not digital_product:
        return 0

    if customer.digital_literacy >= 8:
        return 2

    if customer.digital_literacy <= 3:
        return -2

    return 0


def choose_primary_objection(
    customer: CustomerProfile,
    product: ProductTestInput,
    purchase_intent: int,
) -> str:
    price = product.price

    if (
        customer.financial_behaviour.price_sensitivity >= 8
        and price >= 500
    ):
        return "Price feels too high"

    if customer.personality.risk_tolerance <= 4:
        return "Need proof it actually works"

    if customer.shopping_behaviour.compares_competitors:
        return "Would compare alternatives"

    if customer.personality.trust_requirement >= 8:
        return "Needs stronger trust signals"

    if purchase_intent <= 4:
        return "Needs more information"

    if (
        customer.financial_behaviour.willingness_to_finance <= 3
        and price >= 5000
    ):
        return "Would need a more flexible payment option"

    return "Needs more information"


def evaluate_customer_mock(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> CustomerResponse:
    base = ARCHETYPE_BASE_SCORES.get(
        customer.archetype,
        {
            "interest": 5,
            "purchase": 4,
            "price": 5,
        },
    )

    relevance = calculate_target_relevance(
        customer,
        product,
    )

    price_effect = calculate_price_effect(
        customer,
        product,
    )

    trust_effect = calculate_trust_effect(
        customer,
        product,
    )

    digital_effect = calculate_digital_fit(
        customer,
        product,
    )

    variation = stable_variation(
        customer.id,
        product.product_name,
        1,
    )

    interest = clamp_score(
        base["interest"]
        + relevance * 0.5
        + digital_effect * 0.5
        + variation
    )

    purchase_intent = clamp_score(
        base["purchase"]
        + relevance * 0.6
        + price_effect
        + trust_effect * 0.5
        + digital_effect * 0.5
        + variation
    )

    price_acceptance = clamp_score(
        base["price"]
        + price_effect
        + variation
    )

    understanding = clamp_score(
        6
        + customer.digital_literacy * 0.25
        + relevance * 0.4
        + variation * 0.5
    )

    trust = clamp_score(
        6
        + customer.personality.trust_requirement * 0.25
        + trust_effect
        + variation * 0.5
    )

    would_buy = purchase_intent >= 7

    would_consider = (
        not would_buy
        and purchase_intent >= 4
    )

    primary_objection = choose_primary_objection(
        customer,
        product,
        purchase_intent,
    )

    secondary_objection_options = [
        "Would want to compare alternatives",
        "Needs more information before purchasing",
        "Would want to see real customer results",
        "Would want clearer evidence of value",
        "Would want to understand ongoing costs",
    ]

    secondary_index = (
        int(customer.id)
        + len(product.product_name)
    ) % len(secondary_objection_options)

    secondary_objection = secondary_objection_options[
        secondary_index
    ]

    positive_factors = []

    if relevance >= 2:
        positive_factors.append(
            "Relevant to the customer's needs"
        )

    if price_acceptance >= 6:
        positive_factors.append(
            "Price feels reasonably acceptable"
        )

    if digital_effect > 0:
        positive_factors.append(
            "Strong fit with digital behaviour"
        )

    if trust >= 7:
        positive_factors.append(
            "The proposition feels trustworthy"
        )

    if not positive_factors:
        positive_factors.append(
            "The product has some potential value"
        )

    negative_factors = [
        primary_objection,
        secondary_objection,
    ]

    questions = [
        "What evidence supports the product's claims?",
    ]

    if product.price >= 5000:
        questions.append(
            "What payment or financing options are available?"
        )

    if customer.personality.trust_requirement >= 8:
        questions.append(
            "What warranty, guarantee or support is included?"
        )

    reasoning = (
        f"As a {customer.archetype}, this customer responds "
        f"based on their individual price sensitivity, risk "
        f"tolerance, trust requirements, digital behaviour and "
        f"motivations. The product received a relevance "
        f"adjustment of {relevance}, a price adjustment of "
        f"{price_effect}, and a trust adjustment of "
        f"{trust_effect}."
    )

    return CustomerResponse(
        customer_id=customer.id,
        overall_interest=interest,
        understanding=understanding,
        trust=trust,
        price_acceptance=price_acceptance,
        purchase_intent=purchase_intent,
        would_buy=would_buy,
        would_consider=would_consider,
        primary_objection=primary_objection,
        secondary_objection=secondary_objection,
        positive_factors=positive_factors,
        negative_factors=negative_factors,
        questions=questions,
        reasoning=reasoning,
    )


def use_mock_evaluator() -> bool:
    return (
        os.getenv("CUSTOMER_LAB_USE_MOCK", "true").lower()
        == "true"
    )


def get_default_evaluator() -> CustomerEvaluator:
    if use_mock_evaluator():
        return evaluate_customer_mock

    return evaluate_customer_with_retry


def run_simulation(
    product: ProductTestInput,
    customer_ids: list[str] | None = None,
    max_customers: int | None = None,
    evaluator: CustomerEvaluator | None = None,
) -> SimulationResult:
    if evaluator is None:
        evaluator = get_default_evaluator()

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

    responses_by_customer_id: dict[
        str,
        CustomerResponse,
    ] = {}

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
                response = ensure_response_for_customer(
                    future.result(),
                    customer.id,
                )

                responses_by_customer_id[
                    customer.id
                ] = response

            except Exception as error:
                print(
                    f"Customer {customer.id} failed: "
                    f"{redact_secrets(str(error))}"
                )

                failed_customer_ids.append(
                    customer.id
                )

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
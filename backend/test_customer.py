from models.customer import (
    CustomerProfile,
    FinancialBehaviour,
    Personality,
    ShoppingBehaviour,
)


customer = CustomerProfile(
    id="001",
    name="Sarah Williams",
    age=43,
    state="Victoria",
    location="Melbourne",
    occupation="Accountant",
    income_band="$100,000-$149,999",
    household="Married with two children",
    home_ownership="Homeowner",
    education="University degree",
    digital_literacy=8,

    financial_behaviour=FinancialBehaviour(
        price_sensitivity=8,
        willingness_to_finance=4,
        impulse_buying=2,
    ),

    personality=Personality(
        risk_tolerance=3,
        trust_requirement=9,
        research_tendency=9,
        brand_loyalty=6,
    ),

    shopping_behaviour=ShoppingBehaviour(
        reads_reviews=True,
        compares_competitors=True,
        checks_prices=True,
        prefers_online_shopping=True,
    ),

    motivations=[
        "saving money",
        "long-term value",
        "family security",
    ],

    concerns=[
        "hidden costs",
        "poor customer service",
        "unreliable products",
        "scams",
    ],

    behavioural_rules=[
        "If the price is high, become hesitant.",
        "If strong reviews are available, increase trust.",
        "If important information is missing, ask questions.",
        "Compare competitors before making an expensive purchase.",
        "Do not purchase immediately unless value and trust are both high.",
    ],
)


print(customer.model_dump_json(indent=2))
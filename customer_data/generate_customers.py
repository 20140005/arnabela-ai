import json
from pathlib import Path


# ============================================================
# CUSTOMER LAB
# Synthetic Australian Customer Profile Generator
#
# Generates exactly 100 distinct customer profiles:
# 10 behavioural archetypes × 10 individual customers.
#
# These are synthetic profiles designed for simulation.
# They are not representations of real individuals.
# ============================================================


OUTPUT_FILE = Path(__file__).parent / "customers.json"


# ------------------------------------------------------------
# Australian locations
# ------------------------------------------------------------

LOCATIONS = [
    {
        "state": "Victoria",
        "location": "Melbourne",
    },
    {
        "state": "New South Wales",
        "location": "Sydney",
    },
    {
        "state": "Queensland",
        "location": "Brisbane",
    },
    {
        "state": "Western Australia",
        "location": "Perth",
    },
    {
        "state": "South Australia",
        "location": "Adelaide",
    },
    {
        "state": "Tasmania",
        "location": "Hobart",
    },
    {
        "state": "Australian Capital Territory",
        "location": "Canberra",
    },
    {
        "state": "Northern Territory",
        "location": "Darwin",
    },
    {
        "state": "Victoria",
        "location": "Geelong",
    },
    {
        "state": "New South Wales",
        "location": "Newcastle",
    },
    {
        "state": "Queensland",
        "location": "Gold Coast",
    },
    {
        "state": "Queensland",
        "location": "Townsville",
    },
    {
        "state": "Western Australia",
        "location": "Bunbury",
    },
    {
        "state": "South Australia",
        "location": "Mount Gambier",
    },
    {
        "state": "New South Wales",
        "location": "Wollongong",
    },
    {
        "state": "Victoria",
        "location": "Ballarat",
    },
]


# ------------------------------------------------------------
# Names
# ------------------------------------------------------------

NAMES = [
    "Sarah Williams",
    "Jake Thompson",
    "Emily Brown",
    "Daniel Wilson",
    "Olivia Taylor",
    "James Anderson",
    "Sophie Martin",
    "Liam Johnson",
    "Chloe White",
    "Noah Harris",
    "Mia Davis",
    "William Clark",
    "Isla Robinson",
    "Jack Walker",
    "Grace Hall",
    "Thomas Wright",
    "Amelia Green",
    "Lucas Baker",
    "Charlotte Adams",
    "Henry Nelson",
    "Ella Mitchell",
    "Leo Carter",
    "Ava Roberts",
    "Charlie Phillips",
    "Ruby Evans",
    "Oscar Turner",
    "Matilda Parker",
    "George Collins",
    "Lily Edwards",
    "Harry Stewart",
    "Zoe Sanchez",
    "Ethan Morris",
    "Sienna Rogers",
    "Alexander Reed",
    "Lucy Cook",
    "Max Morgan",
    "Isabella Bell",
    "Samuel Murphy",
    "Evie Bailey",
    "Jack Kelly",
    "Hannah Cooper",
    "Benjamin Richardson",
    "Poppy Cox",
    "Archie Howard",
    "Sophia Ward",
    "Theodore Brooks",
    "Willow Bennett",
    "Hudson Gray",
    "Layla James",
    "Sebastian Watson",
    "Maya Bennett",
    "Oscar Hughes",
    "Aaliyah Price",
    "Cooper Foster",
    "Ruby Sanders",
    "Lachlan Ross",
    "Isabel Jenkins",
    "Finn Powell",
    "Harper Long",
    "Edward Patterson",
    "Ayla Hughes",
    "Nathan Butler",
    "Mila Simmons",
    "Alexander Foster",
    "Freya Henderson",
    "Mason Coleman",
    "Evelyn Peterson",
    "Carter Spencer",
    "Sofia Murray",
    "Jackson Fisher",
    "Ivy Hamilton",
    "Archie Graham",
    "Alice Reynolds",
    "Harrison Griffin",
    "Georgia Wallace",
    "Charlie West",
    "Matilda Cole",
    "James Russell",
    "Luna Chapman",
    "Thomas Gibson",
    "Florence Webb",
    "Henry Holmes",
    "Willow Mills",
    "Leo Richards",
    "Ella Dixon",
    "Jack Pearson",
    "Amelia Douglas",
    "Oliver Graham",
    "Chloe Hunter",
    "William Robertson",
    "Sophie Johnston",
    "Noah Marshall",
    "Grace Shaw",
    "Liam Ellis",
    "Olivia Ferguson",
    "Daniel Matthews",
    "Emily McDonald",
    "Jake Johnston",
    "Sarah Hamilton",
    "Mia Wallace",
]


# ------------------------------------------------------------
# Occupations
# ------------------------------------------------------------

OCCUPATIONS = [
    "Accountant",
    "Electrician",
    "Teacher",
    "Software Developer",
    "Registered Nurse",
    "Small Business Owner",
    "Project Manager",
    "Sales Manager",
    "Engineer",
    "Administrative Professional",
    "Marketing Specialist",
    "Tradie",
    "Graphic Designer",
    "Retail Manager",
    "Financial Adviser",
    "Healthcare Worker",
    "Civil Engineer",
    "Operations Manager",
    "Chef",
    "Real Estate Professional",
]


# ------------------------------------------------------------
# Individual demographic variations
# ------------------------------------------------------------

DEMOGRAPHIC_PROFILES = [
    {
        "age": 22,
        "income_band": "$40,000-$59,999",
        "household": "Single",
        "home_ownership": "Renter",
        "education": "University student",
    },
    {
        "age": 27,
        "income_band": "$50,000-$74,999",
        "household": "Single",
        "home_ownership": "Renter",
        "education": "University degree",
    },
    {
        "age": 31,
        "income_band": "$75,000-$99,999",
        "household": "Couple",
        "home_ownership": "Renter",
        "education": "University degree",
    },
    {
        "age": 36,
        "income_band": "$75,000-$99,999",
        "household": "Couple with one child",
        "home_ownership": "Homeowner",
        "education": "University degree",
    },
    {
        "age": 41,
        "income_band": "$100,000-$149,999",
        "household": "Married with two children",
        "home_ownership": "Homeowner",
        "education": "University degree",
    },
    {
        "age": 46,
        "income_band": "$150,000-$199,999",
        "household": "Married with two children",
        "home_ownership": "Homeowner",
        "education": "Postgraduate degree",
    },
    {
        "age": 52,
        "income_band": "$100,000-$149,999",
        "household": "Couple",
        "home_ownership": "Homeowner",
        "education": "University degree",
    },
    {
        "age": 58,
        "income_band": "$75,000-$99,999",
        "household": "Couple",
        "home_ownership": "Homeowner",
        "education": "Vocational qualification",
    },
    {
        "age": 65,
        "income_band": "$50,000-$74,999",
        "household": "Couple",
        "home_ownership": "Homeowner",
        "education": "Secondary education",
    },
    {
        "age": 72,
        "income_band": "$40,000-$59,999",
        "household": "Single",
        "home_ownership": "Homeowner",
        "education": "Secondary education",
    },
]


# ------------------------------------------------------------
# Ten behavioural archetypes
# ------------------------------------------------------------

ARCHETYPES = [
    {
        "name": "Budget-Focused Buyer",
        "price_sensitivity": 9,
        "willingness_to_finance": 6,
        "impulse_buying": 2,
        "risk_tolerance": 3,
        "trust_requirement": 8,
        "research_tendency": 8,
        "brand_loyalty": 3,
        "digital_literacy": 7,
        "reads_reviews": True,
        "compares_competitors": True,
        "checks_prices": True,
        "prefers_online_shopping": True,
        "motivations": [
            "saving money",
            "getting the best value",
            "avoiding unnecessary expenses",
        ],
        "concerns": [
            "high prices",
            "hidden costs",
            "poor value",
            "unexpected fees",
        ],
        "behavioural_rules": [
            "Evaluate price carefully before considering a purchase.",
            "Compare alternatives when the purchase is expensive.",
            "Look for discounts, promotions, financing or lower-cost alternatives.",
            "Become hesitant when the value proposition is unclear.",
            "Do not buy simply because the product is popular.",
        ],
    },
    {
        "name": "Premium Value Buyer",
        "price_sensitivity": 3,
        "willingness_to_finance": 7,
        "impulse_buying": 4,
        "risk_tolerance": 6,
        "trust_requirement": 8,
        "research_tendency": 7,
        "brand_loyalty": 7,
        "digital_literacy": 8,
        "reads_reviews": True,
        "compares_competitors": True,
        "checks_prices": False,
        "prefers_online_shopping": True,
        "motivations": [
            "quality",
            "long-term value",
            "premium experience",
        ],
        "concerns": [
            "poor quality",
            "weak warranties",
            "bad customer service",
        ],
        "behavioural_rules": [
            "Focus more on quality and long-term value than the cheapest price.",
            "Accept a premium price when the quality difference is convincing.",
            "Expect strong service and warranty support.",
            "Use reviews to verify premium claims.",
        ],
    },
    {
        "name": "Tech Enthusiast",
        "price_sensitivity": 3,
        "willingness_to_finance": 6,
        "impulse_buying": 7,
        "risk_tolerance": 8,
        "trust_requirement": 5,
        "research_tendency": 7,
        "brand_loyalty": 3,
        "digital_literacy": 10,
        "reads_reviews": True,
        "compares_competitors": True,
        "checks_prices": True,
        "prefers_online_shopping": True,
        "motivations": [
            "new technology",
            "performance",
            "convenience",
            "innovation",
        ],
        "concerns": [
            "outdated technology",
            "poor performance",
            "compatibility",
        ],
        "behavioural_rules": [
            "Pay close attention to technical capabilities and performance.",
            "Become more interested when the product introduces meaningful innovation.",
            "Compare technical specifications with competing products.",
            "Accept a higher price when the technology provides meaningful benefits.",
        ],
    },
    {
        "name": "Risk-Averse Researcher",
        "price_sensitivity": 7,
        "willingness_to_finance": 3,
        "impulse_buying": 1,
        "risk_tolerance": 1,
        "trust_requirement": 10,
        "research_tendency": 10,
        "brand_loyalty": 6,
        "digital_literacy": 7,
        "reads_reviews": True,
        "compares_competitors": True,
        "checks_prices": True,
        "prefers_online_shopping": True,
        "motivations": [
            "security",
            "reliability",
            "making a safe decision",
        ],
        "concerns": [
            "scams",
            "unreliable products",
            "hidden conditions",
            "poor support",
        ],
        "behavioural_rules": [
            "Require substantial evidence before making an important purchase.",
            "Look for warranties, guarantees, reviews and transparent policies.",
            "Become highly skeptical when information is missing.",
            "Do not make impulse purchases.",
            "Trust in the company is almost as important as the product.",
        ],
    },
    {
        "name": "Convenience-First Buyer",
        "price_sensitivity": 5,
        "willingness_to_finance": 5,
        "impulse_buying": 6,
        "risk_tolerance": 6,
        "trust_requirement": 6,
        "research_tendency": 4,
        "brand_loyalty": 4,
        "digital_literacy": 8,
        "reads_reviews": False,
        "compares_competitors": False,
        "checks_prices": True,
        "prefers_online_shopping": True,
        "motivations": [
            "saving time",
            "convenience",
            "simplicity",
            "speed",
        ],
        "concerns": [
            "complicated setup",
            "slow service",
            "time-consuming processes",
        ],
        "behavioural_rules": [
            "Prefer products that are easy and quick to understand.",
            "Become less interested when the buying process is complicated.",
            "Value convenience even when another option is slightly cheaper.",
            "Avoid spending significant time researching ordinary purchases.",
        ],
    },
    {
        "name": "Family-Focused Buyer",
        "price_sensitivity": 7,
        "willingness_to_finance": 5,
        "impulse_buying": 2,
        "risk_tolerance": 3,
        "trust_requirement": 9,
        "research_tendency": 8,
        "brand_loyalty": 5,
        "digital_literacy": 7,
        "reads_reviews": True,
        "compares_competitors": True,
        "checks_prices": True,
        "prefers_online_shopping": True,
        "motivations": [
            "family security",
            "reliability",
            "saving household money",
            "practicality",
        ],
        "concerns": [
            "safety",
            "reliability",
            "wasted household money",
            "poor support",
        ],
        "behavioural_rules": [
            "Consider how the purchase affects the whole household.",
            "Prioritise reliability and safety over novelty.",
            "Research expensive purchases carefully.",
            "Be more willing to purchase when the long-term household benefit is clear.",
        ],
    },
    {
        "name": "Sustainability-Focused Buyer",
        "price_sensitivity": 5,
        "willingness_to_finance": 5,
        "impulse_buying": 3,
        "risk_tolerance": 5,
        "trust_requirement": 8,
        "research_tendency": 8,
        "brand_loyalty": 5,
        "digital_literacy": 8,
        "reads_reviews": True,
        "compares_competitors": True,
        "checks_prices": True,
        "prefers_online_shopping": True,
        "motivations": [
            "reducing environmental impact",
            "long-term value",
            "responsible consumption",
        ],
        "concerns": [
            "greenwashing",
            "waste",
            "unsustainable materials",
            "unsupported environmental claims",
        ],
        "behavioural_rules": [
            "Look for evidence behind environmental claims.",
            "Do not accept sustainability marketing without credible information.",
            "Consider environmental impact alongside price and performance.",
            "Become skeptical when sustainability claims appear exaggerated.",
        ],
    },
    {
        "name": "Brand-Loyal Buyer",
        "price_sensitivity": 4,
        "willingness_to_finance": 6,
        "impulse_buying": 4,
        "risk_tolerance": 5,
        "trust_requirement": 7,
        "research_tendency": 5,
        "brand_loyalty": 10,
        "digital_literacy": 7,
        "reads_reviews": True,
        "compares_competitors": False,
        "checks_prices": False,
        "prefers_online_shopping": True,
        "motivations": [
            "trust",
            "familiarity",
            "consistent quality",
            "good service",
        ],
        "concerns": [
            "unknown brands",
            "poor service",
            "inconsistent quality",
        ],
        "behavioural_rules": [
            "Give established and trusted brands an advantage.",
            "Require stronger evidence from unfamiliar brands.",
            "Previous positive experiences strongly influence future decisions.",
            "Do not switch brands without a compelling reason.",
        ],
    },
    {
        "name": "Impulse Early Adopter",
        "price_sensitivity": 2,
        "willingness_to_finance": 7,
        "impulse_buying": 10,
        "risk_tolerance": 9,
        "trust_requirement": 4,
        "research_tendency": 2,
        "brand_loyalty": 2,
        "digital_literacy": 9,
        "reads_reviews": False,
        "compares_competitors": False,
        "checks_prices": False,
        "prefers_online_shopping": True,
        "motivations": [
            "excitement",
            "new experiences",
            "innovation",
            "being an early adopter",
        ],
        "concerns": [
            "boring products",
            "slow processes",
            "lack of innovation",
        ],
        "behavioural_rules": [
            "Respond strongly to novelty and exciting product positioning.",
            "Do not spend excessive time researching ordinary purchases.",
            "Can purchase quickly when the product appears genuinely useful or interesting.",
            "Become less interested when the product feels outdated.",
        ],
    },
    {
        "name": "Practical Skeptical Buyer",
        "price_sensitivity": 7,
        "willingness_to_finance": 3,
        "impulse_buying": 1,
        "risk_tolerance": 3,
        "trust_requirement": 9,
        "research_tendency": 8,
        "brand_loyalty": 4,
        "digital_literacy": 6,
        "reads_reviews": True,
        "compares_competitors": True,
        "checks_prices": True,
        "prefers_online_shopping": False,
        "motivations": [
            "practical usefulness",
            "reliability",
            "getting value for money",
        ],
        "concerns": [
            "unnecessary features",
            "poor reliability",
            "misleading claims",
            "difficult support",
        ],
        "behavioural_rules": [
            "Focus on whether the product solves a genuine problem.",
            "Be skeptical of exaggerated marketing claims.",
            "Prefer proven functionality over unnecessary features.",
            "Compare alternatives before expensive purchases.",
            "Require clear evidence that the product is worth the money.",
        ],
    },
]


# ------------------------------------------------------------
# Customer creation
# ------------------------------------------------------------

def build_customer(customer_number: int) -> dict:
    """
    Create one customer profile.

    Customer numbers 1-10:
        Budget-Focused Buyers

    Customer numbers 11-20:
        Premium Value Buyers

    ...

    Customer numbers 91-100:
        Practical Skeptical Buyers
    """

    if not 1 <= customer_number <= 100:
        raise ValueError("customer_number must be between 1 and 100.")

    archetype_index = (customer_number - 1) // 10
    variation_index = (customer_number - 1) % 10

    archetype = ARCHETYPES[archetype_index]
    demographic = DEMOGRAPHIC_PROFILES[variation_index]
    location = LOCATIONS[(customer_number - 1) % len(LOCATIONS)]
    occupation = OCCUPATIONS[(customer_number - 1) % len(OCCUPATIONS)]
    name = NAMES[customer_number - 1]

    customer = {
        "id": f"{customer_number:03d}",
        "name": name,

        "archetype": archetype["name"],

        "age": demographic["age"],
        "state": location["state"],
        "location": location["location"],
        "occupation": occupation,
        "income_band": demographic["income_band"],
        "household": demographic["household"],
        "home_ownership": demographic["home_ownership"],
        "education": demographic["education"],

        "digital_literacy": archetype["digital_literacy"],

        "financial_behaviour": {
            "price_sensitivity": archetype["price_sensitivity"],
            "willingness_to_finance": archetype["willingness_to_finance"],
            "impulse_buying": archetype["impulse_buying"],
        },

        "personality": {
            "risk_tolerance": archetype["risk_tolerance"],
            "trust_requirement": archetype["trust_requirement"],
            "research_tendency": archetype["research_tendency"],
            "brand_loyalty": archetype["brand_loyalty"],
        },

        "shopping_behaviour": {
            "reads_reviews": archetype["reads_reviews"],
            "compares_competitors": archetype["compares_competitors"],
            "checks_prices": archetype["checks_prices"],
            "prefers_online_shopping": archetype["prefers_online_shopping"],
        },

        "motivations": list(archetype["motivations"]),
        "concerns": list(archetype["concerns"]),
        "behavioural_rules": list(archetype["behavioural_rules"]),
    }

    return customer


# ------------------------------------------------------------
# Validation
# ------------------------------------------------------------

def validate_customers(customers: list[dict]) -> None:
    """
    Validate the generated customer population before saving it.
    """

    # Exactly 100 customers
    if len(customers) != 100:
        raise ValueError(
            f"Expected exactly 100 customers, got {len(customers)}."
        )

    # IDs must be unique
    ids = [customer["id"] for customer in customers]

    if len(set(ids)) != 100:
        raise ValueError("Customer IDs are not unique.")

    # Names must be unique
    names = [customer["name"] for customer in customers]

    if len(set(names)) != 100:
        raise ValueError("Customer names are not unique.")

    # Exactly 10 customers per archetype
    archetype_counts = {}

    for customer in customers:
        archetype = customer["archetype"]
        archetype_counts[archetype] = archetype_counts.get(archetype, 0) + 1

    if len(archetype_counts) != 10:
        raise ValueError(
            f"Expected 10 archetypes, got {len(archetype_counts)}."
        )

    for archetype, count in archetype_counts.items():
        if count != 10:
            raise ValueError(
                f"Archetype '{archetype}' has {count} customers instead of 10."
            )

    # Validate score ranges
    for customer in customers:

        score_groups = [
            customer["financial_behaviour"],
            customer["personality"],
        ]

        for group in score_groups:
            for key, value in group.items():
                if not isinstance(value, int):
                    raise ValueError(
                        f"{customer['id']}: {key} must be an integer."
                    )

                if not 1 <= value <= 10:
                    raise ValueError(
                        f"{customer['id']}: {key} must be between 1 and 10."
                    )

        digital_literacy = customer["digital_literacy"]

        if not 1 <= digital_literacy <= 10:
            raise ValueError(
                f"{customer['id']}: digital_literacy must be between 1 and 10."
            )

    print("Validation successful.")
    print(f"Total customers: {len(customers)}")

    print("\nArchetype distribution:")

    for archetype, count in archetype_counts.items():
        print(f"  {archetype}: {count}")


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main() -> None:
    customers = [
        build_customer(customer_number)
        for customer_number in range(1, 101)
    ]

    validate_customers(customers)

    with OUTPUT_FILE.open("w", encoding="utf-8") as file:
        json.dump(
            customers,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print(f"\nGenerated {len(customers)} customer profiles.")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
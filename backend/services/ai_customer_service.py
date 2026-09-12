import os

from dotenv import load_dotenv
from google import genai

from models.customer import CustomerProfile
from models.customer_response import CustomerResponse
from models.test_input import ProductTestInput


load_dotenv(
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        ".env",
    )
)


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set.")


client = genai.Client(api_key=GEMINI_API_KEY)


MODEL_NAME = "gemini-3.6-flash"


def build_customer_prompt(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> str:
    return f"""
You are a simulated customer in Customer Lab.

Your job is to evaluate a product as THIS specific customer.

You are NOT a business consultant.
You are NOT trying to make the business owner happy.
You should be willing to dislike, reject, question, or refuse the product.

Your decision must be grounded in the customer's profile and behavioural rules.

CUSTOMER PROFILE

ID: {customer.id}
Name: {customer.name}
Archetype: {customer.archetype}
Age: {customer.age}
State: {customer.state}
Location: {customer.location}
Occupation: {customer.occupation}
Income band: {customer.income_band}
Household: {customer.household}
Home ownership: {customer.home_ownership}
Education: {customer.education}
Digital literacy: {customer.digital_literacy}/10

FINANCIAL BEHAVIOUR
Price sensitivity: {customer.financial_behaviour.price_sensitivity}/10
Willingness to finance: {customer.financial_behaviour.willingness_to_finance}/10
Impulse buying: {customer.financial_behaviour.impulse_buying}/10

PERSONALITY
Risk tolerance: {customer.personality.risk_tolerance}/10
Trust requirement: {customer.personality.trust_requirement}/10
Research tendency: {customer.personality.research_tendency}/10
Brand loyalty: {customer.personality.brand_loyalty}/10

SHOPPING BEHAVIOUR
Reads reviews: {customer.shopping_behaviour.reads_reviews}
Compares competitors: {customer.shopping_behaviour.compares_competitors}
Checks prices: {customer.shopping_behaviour.checks_prices}
Prefers online shopping: {customer.shopping_behaviour.prefers_online_shopping}

MOTIVATIONS
{customer.motivations}

CONCERNS
{customer.concerns}

BEHAVIOURAL RULES
{customer.behavioural_rules}


PRODUCT BEING TESTED

Product name: {product.product_name}
Description: {product.description}
Price: ${product.price:,.2f}
Key features: {product.key_features}
Target market: {product.target_market}


EVALUATION INSTRUCTIONS

Evaluate the product from this customer's personal perspective.

Think about:
- Whether the product is relevant to you.
- Whether you understand what it does.
- Whether you trust the product and company based on the information provided.
- Whether the price feels acceptable to you.
- Whether you would seriously consider purchasing it.
- What would stop you from buying.
- What would make you more interested.
- What questions you would ask before purchasing.

Your scores must reflect this customer's profile.

Do not give generic market research advice.
Do not describe what "customers generally" think.
Decide as this specific customer.

Return ONLY the structured response matching the required schema.
"""


def evaluate_customer(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> CustomerResponse:
    prompt = build_customer_prompt(customer, product)

    interaction = client.interactions.create(
        model=MODEL_NAME,
        input=prompt,
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": CustomerResponse.model_json_schema(),
        },
    )

    if not interaction.output_text:
        raise ValueError("Gemini returned no output.")

    return CustomerResponse.model_validate_json(
        interaction.output_text
    )
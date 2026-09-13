import json
import os

from dotenv import load_dotenv
from google import genai
from pydantic import ValidationError

from models.customer import CustomerProfile
from models.customer_response import (
    CustomerResponse,
    ensure_response_for_customer,
)
from models.test_input import ProductTestInput


load_dotenv(
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        ".env",
    )
)


DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
MODEL_NAME = DEFAULT_GEMINI_MODEL

_gemini_client = None


def get_gemini_model() -> str:
    configured = os.getenv("GEMINI_MODEL", "").strip()
    return configured or DEFAULT_GEMINI_MODEL


def get_gemini_client():
    global _gemini_client

    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. "
                "Set CUSTOMER_LAB_USE_MOCK=true to use the "
                "deterministic evaluator, or provide "
                "GEMINI_API_KEY to use Gemini."
            )

        _gemini_client = genai.Client(api_key=api_key)

    return _gemini_client


def _format_bullet_list(items: list[str]) -> str:
    if not items:
        return "- None supplied"

    return "\n".join(f"- {item}" for item in items)


def _yes_no(value: bool) -> str:
    return "yes" if value else "no"


def redact_secrets(text: str) -> str:
    redacted = text
    api_key = os.getenv("GEMINI_API_KEY")

    if api_key:
        redacted = redacted.replace(api_key, "[REDACTED]")

    return redacted


def is_quota_or_rate_limit_error(error: Exception) -> bool:
    status_code = getattr(error, "code", None)

    if status_code is None:
        status_code = getattr(error, "status_code", None)

    if status_code == 429:
        return True

    error_text = str(error).lower()
    status_text = str(getattr(error, "status", "")).lower()

    quota_markers = (
        "429",
        "quota exceeded",
        "quota/rate-limit",
        "rate limit",
        "too many requests",
        "resource_exhausted",
        "resource exhausted",
    )

    return any(
        marker in error_text or marker in status_text
        for marker in quota_markers
    )


def _gemini_evaluation_error(error: Exception) -> Exception:
    message = redact_secrets(str(error))

    if is_quota_or_rate_limit_error(error):
        return RuntimeError(
            f"Gemini quota/rate-limit error (429): {message}"
        )

    return RuntimeError(
        f"Gemini evaluation failed: {message}"
    )


def _extract_json_text(output_text: str) -> str:
    text = output_text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    return text


def build_customer_prompt(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> str:
    return f"""
You are this specific simulated customer.

You are evaluating a product, advertisement, offer, website, or concept as ONE individual in Arnabela, a synthetic customer simulation.

Identity:
- You are {customer.name}, a {customer.age}-year-old {customer.occupation} in {customer.location}, {customer.state}.
- You are a simulated profile, not a real human. Do not claim this represents a real person.
- You must make an individual decision for yourself, not for a market segment.

You are NOT a business consultant.
You are NOT a market researcher.
You are NOT trying to make the business owner happy.
You must NOT:
- give generic market research advice
- describe what customers generally think
- use population statistics unless they were supplied
- invent facts about the product, company, brand, reviews, warranty, or competitors
- assume information that was not supplied
- ignore this customer's behavioural rules

If information is missing, say so through your questions, objections, trust score, and purchase intent. Do not fill gaps with invented details.

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
Reads reviews: {_yes_no(customer.shopping_behaviour.reads_reviews)}
Compares competitors: {_yes_no(customer.shopping_behaviour.compares_competitors)}
Checks prices: {_yes_no(customer.shopping_behaviour.checks_prices)}
Prefers online shopping: {_yes_no(customer.shopping_behaviour.prefers_online_shopping)}

MOTIVATIONS
{_format_bullet_list(customer.motivations)}

CONCERNS
{_format_bullet_list(customer.concerns)}

BEHAVIOURAL RULES
These rules constrain your decision. Follow them.
{_format_bullet_list(customer.behavioural_rules)}


PRODUCT BEING TESTED

Use only the information below. Do not invent additional product or company facts.

Product name: {product.product_name}
Description: {product.description}
Price: ${product.price:,.2f}
Key features:
{_format_bullet_list(product.key_features)}
Target market: {product.target_market}


HOW TO USE THIS PROFILE

Your scores and reasoning must change because of THIS profile:
- Age, location, occupation, income, household, home ownership, education, and digital literacy affect relevance and understanding.
- High price sensitivity should lower price_acceptance and can lower purchase_intent.
- Low willingness to finance should make expensive purchases harder unless the price already feels affordable.
- Low impulse buying should make you refuse to buy quickly.
- High risk tolerance does not mean you ignore missing evidence; high trust requirement should lower trust when proof is absent.
- High research tendency, reading reviews, comparing competitors, or checking prices should increase questions and make would_buy harder unless evidence was supplied.
- Brand loyalty should make unfamiliar brands harder to accept if no brand evidence was supplied.
- Motivations can attract you; concerns and behavioural rules can cause rejection or uncertainty.

You MAY:
- reject the product
- be uncertain
- be interested without intending to buy
- ask for information you would personally need

Distinguish overall_interest from purchase_intent. Interest is curiosity or relevance. Purchase intent is whether you would actually spend money based only on the supplied facts.

would_buy should be true only if you would buy now with the information provided.
would_consider should be true if you would not buy now but would keep evaluating.


EVALUATION TASK

Decide as this specific customer:
- Is this relevant to your life and work?
- Do you understand it?
- Do you trust it based only on the supplied information?
- Is the price acceptable for your income and price sensitivity?
- Would you seriously consider buying it?
- What attracts you?
- What concerns you?
- What information do you still need?
- What would stop you from buying?

REASONING REQUIREMENT

Write reasoning in first person as this customer.
Ground it in your occupation, finances, shopping habits, motivations, concerns, and behavioural rules.
Do not write generic statements such as "customers may like the product because it is convenient."


OUTPUT

Return ONLY valid JSON matching the required schema. No markdown. No extra keys.

JSON fields:
- customer_id: must be "{customer.id}"
- overall_interest: integer 1-10
- understanding: integer 1-10
- trust: integer 1-10
- price_acceptance: integer 1-10
- purchase_intent: integer 1-10
- would_buy: boolean
- would_consider: boolean
- primary_objection: string
- secondary_objection: string
- positive_factors: array of strings about what attracts YOU
- negative_factors: array of strings about what concerns YOU
- questions: array of strings YOU would ask before purchasing
- reasoning: first-person explanation of YOUR individual decision
"""


def _json_preview(text: str) -> str:
    preview = " ".join(text.split())
    return redact_secrets(preview[:200])


def parse_customer_response(
    output_text: str | None,
    customer_id: str,
) -> CustomerResponse:
    if output_text is None or not str(output_text).strip():
        raise ValueError("Gemini returned no output.")

    json_text = _extract_json_text(str(output_text))

    try:
        payload = json.loads(json_text)
    except json.JSONDecodeError as error:
        raise ValueError(
            "Gemini returned invalid JSON: "
            f"{error.msg} (preview: {_json_preview(json_text)!r})"
        ) from error

    if not isinstance(payload, dict):
        raise ValueError(
            "Gemini returned JSON that was not an object "
            f"(preview: {_json_preview(json_text)!r})."
        )

    try:
        response = CustomerResponse.model_validate(payload)
    except ValidationError as error:
        raise ValueError(
            "Gemini returned JSON that did not match "
            "CustomerResponse: "
            f"{redact_secrets(str(error))}"
        ) from error

    return ensure_response_for_customer(response, customer_id)


def evaluate_customer(
    customer: CustomerProfile,
    product: ProductTestInput,
) -> CustomerResponse:
    prompt = build_customer_prompt(customer, product)

    try:
        interaction = get_gemini_client().interactions.create(
            model=get_gemini_model(),
            input=prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": CustomerResponse.model_json_schema(),
            },
        )
    except Exception as error:
        raise _gemini_evaluation_error(error) from error

    return parse_customer_response(
        interaction.output_text,
        customer.id,
    )

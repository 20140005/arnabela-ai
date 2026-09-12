from models.customer import CustomerProfile
from models.test_input import ProductTestInput
from services.ai_customer_service import evaluate_customer
from services.customer_service import get_customer_by_id


product = ProductTestInput(
    product_name="Home Solar Battery",
    description=(
        "A home battery that stores excess solar energy during the day "
        "so homeowners can use that energy at night."
    ),
    price=12000,
    key_features=[
        "10 kWh storage capacity",
        "10-year warranty",
        "Mobile app monitoring",
    ],
    target_market="Australian residential homeowners",
)


customer = get_customer_by_id("011")

if customer is None:
    raise RuntimeError("Customer 001 was not found.")


result = evaluate_customer(customer, product)

print("\n=== CUSTOMER LAB AI RESULT ===\n")
print(result.model_dump_json(indent=2))
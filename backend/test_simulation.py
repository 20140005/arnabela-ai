from models.test_input import ProductTestInput
from services.simulation_service import run_simulation


product = ProductTestInput(
    product_name="AI Field Service Assistant",
    description=(
        "An AI assistant designed for Australian tradespeople that "
        "automatically turns voice notes from job sites into "
        "customer-ready quotes, invoices, job summaries and follow-up "
        "messages. It works from a mobile phone and reduces the "
        "administrative work required after each job."
    ),
    price=199,
    key_features=[
        "Voice-to-job-note conversion",
        "Automatic quote generation",
        "Automatic invoice preparation",
        "Customer follow-up messages",
        "Mobile-first workflow",
    ],
    target_market=(
        "Australian electricians, plumbers, builders and other "
        "tradespeople"
    ),
)


result = run_simulation(
    product,
    customer_ids=[
        "001",
        "011",
        "021",
        "031",
        "041",
        "051",
        "061",
        "071",
        "081",
        "091",
    ],
)


print("\n=== CUSTOMER LAB SIMULATION ===\n")

print(f"Test ID: {result.test_id}")
print(f"Total customers: {result.total_customers}")
print(f"Completed: {result.completed_customers}")
print(f"Failed: {result.failed_customers}")

if result.failed_customer_ids:
    print(
        f"Failed customer IDs: "
        f"{', '.join(result.failed_customer_ids)}"
    )

print("\n=== CUSTOMER RESPONSES ===\n")

for response in result.responses:
    print(
        f"{response.customer_id}: "
        f"interest={response.overall_interest}/10, "
        f"purchase_intent={response.purchase_intent}/10, "
        f"would_buy={response.would_buy}"
    )
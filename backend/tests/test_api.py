from fastapi.testclient import TestClient

from main import app
from models.customer_response import CustomerResponse


client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "running"


def test_health():
    response = client.get("/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "healthy"


def test_all_customers():
    response = client.get("/customers")

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 100
    assert len(data["customers"]) == 100


def test_customer_001():
    response = client.get("/customers/001")

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == "001"
    assert data["name"] == "Sarah Williams"


def test_customer_999_not_found():
    response = client.get("/customers/999")

    assert response.status_code == 404


def test_customer_profiles_have_required_fields():
    response = client.get("/customers")

    assert response.status_code == 200

    customers = response.json()["customers"]

    required_fields = {
        "id",
        "name",
        "archetype",
        "age",
        "state",
        "location",
        "occupation",
        "income_band",
        "household",
        "home_ownership",
        "education",
        "digital_literacy",
        "financial_behaviour",
        "personality",
        "shopping_behaviour",
        "motivations",
        "concerns",
        "behavioural_rules",
    }

    for customer in customers:
        assert required_fields.issubset(customer.keys())


def fake_customer_evaluator(customer, product):
    return CustomerResponse(
        customer_id=customer.id,
        overall_interest=7,
        understanding=8,
        trust=7,
        price_acceptance=6,
        purchase_intent=6,
        would_buy=True,
        would_consider=True,
        primary_objection="Needs more information.",
        secondary_objection="Would compare alternatives.",
        positive_factors=[
            "Relevant product",
            "Clear value proposition",
        ],
        negative_factors=[
            "Needs more information",
        ],
        questions=[
            "What support is included?",
        ],
        reasoning=(
            "This simulated response is used for testing "
            "the Customer Lab simulation pipeline."
        ),
    )


def test_create_simulation():
    response = client.post(
        "/simulations",
        json={
            "product_name": "AI Field Service Assistant",
            "description": (
                "An AI assistant for Australian tradespeople "
                "that reduces administrative work."
            ),
            "price": 199,
            "key_features": [
                "Voice-to-job-note conversion",
                "Automatic quote generation",
                "Automatic invoice preparation",
            ],
            "target_market": (
                "Australian electricians, plumbers and builders"
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_customers"] == 100
    assert data["completed_customers"] == 100
    assert data["failed_customers"] == 0
    assert data["failed_customer_ids"] == []
    assert len(data["responses"]) == 100


def test_create_simulation_validates_input():
    response = client.post(
        "/simulations",
        json={
            "product_name": "",
            "description": "",
            "price": -10,
            "key_features": [],
            "target_market": "",
        },
    )

    assert response.status_code == 422


def test_create_simulation_with_customer_ids(monkeypatch):
    from services import simulation_service

    monkeypatch.setattr(
        simulation_service,
        "get_default_evaluator",
        lambda: fake_customer_evaluator,
    )

    response = client.post(
        "/simulations",
        json={
            "product_name": "FreshMind Smart Fridge",
            "description": "A smart refrigerator for households.",
            "price": 2199,
            "key_features": ["AI-powered food recognition"],
            "target_market": "Australian households",
            "customer_ids": ["001", "011", "021"],
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_customers"] == 3
    assert data["completed_customers"] == 3
    assert sorted(
        item["customer_id"] for item in data["responses"]
    ) == ["001", "011", "021"]

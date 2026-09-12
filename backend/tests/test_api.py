from fastapi.testclient import TestClient

from main import app


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
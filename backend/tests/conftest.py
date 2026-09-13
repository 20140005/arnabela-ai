import pytest

from services import ai_customer_service as ai_customer_service


@pytest.fixture(autouse=True)
def prevent_real_gemini_calls(monkeypatch):
    monkeypatch.setenv("CUSTOMER_LAB_USE_MOCK", "true")

    def blocked_client(*args, **kwargs):
        raise AssertionError(
            "google.genai.Client was constructed during pytest. "
            "Automated tests must use mocked or fake evaluators."
        )

    monkeypatch.setattr(
        ai_customer_service.genai,
        "Client",
        blocked_client,
    )
    monkeypatch.setattr(
        ai_customer_service,
        "_gemini_client",
        None,
    )

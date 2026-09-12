"""
Manual Gemini test.

This file is intentionally skipped by pytest because it makes
real Gemini API calls and should not consume API quota during
automated testing.
"""

import pytest


pytestmark = pytest.mark.skip(
    reason="Manual Gemini test - not run during automated pytest."
)


def test_ai_customer_manual():
    pass
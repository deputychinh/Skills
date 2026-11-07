from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_applies_discount():
    r = client.post(
        "/orders", json={"sku": "A1", "quantity": 2, "unit_price": 5, "discount_code": "welcome10"}
    )
    assert r.status_code == 201
    assert r.json()["total"] == 9.0

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_creates_order():
    r = client.post("/orders", json={"sku": "A1", "quantity": 2, "unit_price": 3.5})
    assert r.status_code == 201
    assert r.json()["total"] == 7.0

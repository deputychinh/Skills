from fastapi.testclient import TestClient

from main import app


def test_lists_orders():
    assert TestClient(app).get("/orders").status_code == 200

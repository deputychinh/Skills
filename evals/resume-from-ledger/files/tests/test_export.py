from datetime import date

import pytest

from app.export import InvalidRange, export_orders

ORDERS = [
    {"id": 1, "created_at": date(2026, 11, 1), "customer": "Ana", "total": "12.50"},
    {"id": 2, "created_at": date(2026, 11, 3), "customer": "Bo", "total": "7.00"},
]


def test_exports_one_row_per_order():
    csv_text = export_orders(ORDERS, date(2026, 11, 1), date(2026, 11, 30))
    assert len(csv_text.strip().splitlines()) == 3


def test_rejects_inverted_range():
    with pytest.raises(InvalidRange):
        export_orders(ORDERS, date(2026, 11, 30), date(2026, 11, 1))

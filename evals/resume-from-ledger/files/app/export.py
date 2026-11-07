import csv
import io
from datetime import date

HEADER = ["id", "created_at", "customer", "total"]


class InvalidRange(ValueError):
    pass


def export_orders(orders, start: date, end: date) -> str:
    if end < start:
        raise InvalidRange("end before start")
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(HEADER)
    for order in orders:
        if start <= order["created_at"] <= end:
            writer.writerow([order["id"], order["created_at"].isoformat(), order["customer"], order["total"]])
    return out.getvalue()

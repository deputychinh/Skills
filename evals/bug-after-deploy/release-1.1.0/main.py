from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

DISCOUNTS = {"WELCOME10": 0.10, "VIP20": 0.20}


class OrderIn(BaseModel):
    sku: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)
    discount_code: str | None = None


@app.post("/orders", status_code=201)
def create_order(order: OrderIn):
    rate = DISCOUNTS[order.discount_code.upper()]
    total = order.quantity * order.unit_price * (1 - rate)
    return {"sku": order.sku, "total": round(total, 2)}

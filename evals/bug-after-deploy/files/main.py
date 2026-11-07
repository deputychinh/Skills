from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()


class OrderIn(BaseModel):
    sku: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)


@app.post("/orders", status_code=201)
def create_order(order: OrderIn):
    return {"sku": order.sku, "total": round(order.quantity * order.unit_price, 2)}

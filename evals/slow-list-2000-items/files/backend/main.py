from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import connect

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"])


@app.get("/orders")
def list_orders():
    conn = connect()
    rows = conn.execute("SELECT * FROM orders").fetchall()
    result = []
    for row in rows:
        customer = conn.execute("SELECT name FROM customers WHERE id = ?", (row["customer_id"],)).fetchone()
        result.append({**dict(row), "customer": customer["name"] if customer else None})
    return result

import random
import sys
from datetime import datetime, timedelta

from db import connect

count = int(sys.argv[1]) if len(sys.argv) > 1 else 50
conn = connect()
conn.execute("DELETE FROM orders")
conn.execute("DELETE FROM customers")
for i in range(1, 201):
    conn.execute("INSERT INTO customers (id, name) VALUES (?, ?)", (i, f"Customer {i}"))
now = datetime(2026, 11, 1)
for i in range(1, count + 1):
    conn.execute(
        "INSERT INTO orders (id, customer_id, status, total, created_at) VALUES (?, ?, ?, ?, ?)",
        (i, random.randint(1, 200), random.choice(["new", "paid", "shipped"]),
         round(random.uniform(5, 500), 2), (now - timedelta(minutes=i)).isoformat()),
    )
conn.commit()
print(f"seeded {count} orders")

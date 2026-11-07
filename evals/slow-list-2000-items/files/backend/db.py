import sqlite3
from pathlib import Path

DB = Path(__file__).with_name("orders.db")


def connect():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT)")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, customer_id INTEGER, "
        "status TEXT, total REAL, created_at TEXT)"
    )
    return conn

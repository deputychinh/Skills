# Order export — spec

- AC1: Given orders in the range, when I export, then I get a CSV with one row per order.
- AC2: Given an invalid range (end before start), when I export, then I get a 422 problem response.
- AC3: Given no orders in the range, when I export, then I get a CSV with only the header row.

# ORD-41: Export orders as CSV

- Status: doing · Delivery: docs/delivery/002-order-export

Acceptance criteria: AC1–AC3 in `docs/delivery/002-order-export/spec.md`.

## QA

| AC  | Test(s)                                              | Result |
| --- | ---------------------------------------------------- | ------ |
| AC1 | tests/test_export.py::test_exports_one_row_per_order | pass   |
| AC2 | tests/test_export.py::test_rejects_inverted_range    | pass   |
| AC3 |                                                      |        |

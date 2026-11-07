# API design (HTTP/JSON and events)

Based on the Zalando RESTful API and Event Guidelines (MUST/SHOULD language), Microsoft REST API Guidelines, Google AIP, RFC 9457.

## MUST

- **Contract first**: OpenAPI 3.1 written/reviewed before code; generated server stubs or validated at runtime; clients generate types (`openapi-typescript`). The contract is versioned with the code and exported by a make target (`make openapi`).
- **Resources, not verbs**: nouns, plural, kebab-case paths (`/practice-items/{id}/attempts`); max 3 levels of nesting; actions that are not CRUD become sub-resources (`POST /orders/{id}/cancellations`).
- **JSON**: `snake_case` fields on Python APIs, `camelCase` on Node APIs, never both; ISO-8601 UTC timestamps with `Z`; money as `{amount: "12.50", currency: "VND"}` strings, never floats; ids as strings (UUID v4, ULID when sort order matters).
- **Errors**: RFC 9457 `application/problem+json` with `type`, `title`, `status`, `detail`, `instance` and an extension `code` from the enum. No stack traces; 4xx for client faults, 5xx for ours; 422 for validation with field-level `errors[]`.
- **Status codes**: 200/201(+`Location`)/202 (async with job URL)/204; 400 malformed, 401 unauthenticated, 403 forbidden, 404, 409 conflict/version mismatch, 412/428 with ETags, 429 with `Retry-After`.
- **Pagination** on every collection: cursor-based (`?cursor=&limit=`, response `{items, next_cursor}`); offset only for admin tables; never a total count on large tables unless cheap.
- **Idempotency**: PUT/DELETE idempotent by definition; POST that creates accepts `Idempotency-Key` and replays the first response for 24 h.
- **Versioning**: avoid breaking changes (additive only: new optional fields, new endpoints). When unavoidable, `/api/v2` path; never date-less silent changes. Deprecation with `Deprecation`/`Sunset` headers.
- **Security**: TLS only; OAuth2/OIDC bearer or signed device token; scopes per resource; rate limit per principal; CORS allow-list; request body limit; input validated by schema at the edge (ASVS V2/V4).
- **Observability**: `X-Request-Id` accepted and echoed; structured access log; RED metrics; `/health` and `/ready`.

## SHOULD

- Filtering `?filter[status]=open`, sorting `?sort=-created_at`, sparse fields `?fields=`; document each.
- Conditional requests: `ETag` + `If-None-Match` on GET, `If-Match` on PUT/PATCH for optimistic concurrency.
- Long operations: `202 Accepted` + `/jobs/{id}` polling or webhook; never a 30 s request.
- Bulk endpoints return per-item status (207-style body) rather than failing all.
- Caching headers (`Cache-Control`) on public reads; `no-store` on personal data.
- File upload: multipart with explicit size/type limits; scan; store outside the web root; serve through signed URLs.

## Events (when there is a queue/stream)

- Event = fact in the past tense (`OrderPlaced`), immutable, versioned schema (`order.placed.v1`), envelope with `id`, `type`, `occurred_at`, `producer`, `trace_id`, `data`.
- **Transactional outbox** for publish-after-commit; **idempotent consumers** keyed by event id; retry with backoff; DLQ with alert; at-least-once is the assumption everywhere.
- Choreography by default; a saga/orchestrator only for multi-step compensations documented in an ADR.

## Review questions

- Can a client build the whole UI from the contract without reading our code?
- What happens on retry of every write? On a duplicate? On partial failure?
- Which fields are PII; which endpoints need audit logs?

Sources: opensource.zalando.com/restful-api-guidelines; RFC 9457 (Problem Details, 2023); Microsoft REST API Guidelines; Google API Improvement Proposals; Richardson, _Microservices Patterns_ (2018) for outbox/saga; OWASP ASVS 5.0 chapters V2, V4.

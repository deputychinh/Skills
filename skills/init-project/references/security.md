# Security checklist

Aligned with OWASP Top 10:2025 and ASVS 5.0 (level 1 for every project, level 2 when there is money, health or auth).

## OWASP Top 10:2025 → what we do

| #   | Category                                      | Control in this repo                                                                                                                                                                           |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Broken Access Control (incl. BOLA/BFLA, SSRF) | authorization in the service layer per object (`can(user, action, resource)`), deny by default, tests for every role; outbound fetches to allow-listed hosts only                              |
| A02 | Security Misconfiguration                     | settings typed and validated at boot, debug off in prod, security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy), CORS allow-list, no default credentials                        |
| A03 | Software Supply Chain Failures                | lockfiles committed (`package-lock.json`, `uv.lock`), exact pins for tooling, `npm audit`/`pip-audit` in CI, Dependabot/Renovate, no post-install scripts unless allow-listed, SBOM on release |
| A04 | Cryptographic Failures                        | TLS everywhere, Argon2id/bcrypt for passwords, secrets in a store, no home-made crypto, tokens random ≥ 128 bit, PII encrypted at rest where required                                          |
| A05 | Injection                                     | parameterised queries/ORM only, schema validation at the edge, output encoding by the framework, no string-built shell commands                                                                |
| A06 | Insecure Design                               | threat model in ADR for auth/payments/uploads; abuse cases in tests; rate limits; least privilege                                                                                              |
| A07 | Authentication Failures                       | OIDC provider or well-reviewed library, MFA available, session rotation on login, lockout/throttling, WCAG 2.2 accessible auth (no cognitive puzzles)                                          |
| A08 | Software or Data Integrity Failures           | signed releases/images, CI from trusted runners, no `curl                                                                                                                                      | sh`, webhook signatures verified, deserialisation only of validated schemas |
| A09 | Logging & Alerting Failures                   | structured security events (login, authz denial, admin actions) with ids, alerts on anomalies, no secrets/PII in logs, logs retained per policy                                                |
| A10 | Mishandling of Exceptional Conditions         | fail closed, one error boundary, no silent fallback, timeouts everywhere, resource limits (body size, upload size, pagination max)                                                             |

## Baseline for every repo (ASVS L1)

- `.env` ignored; `.env.example` complete; secret scanning (gitleaks) in pre-commit or CI.
- Input: validate type, length, range, format at the boundary; reject unknown fields on writes.
- Output: templates auto-escape; JSON responses never embed raw HTML; `Content-Type` exact.
- Sessions/tokens: `HttpOnly; Secure; SameSite=Lax` cookies or bearer tokens with short expiry + refresh; logout invalidates.
- Files: limit size/type, store outside web root or object storage, serve via signed URL, never trust client file name.
- Headers: CSP (nonce-based for inline scripts), HSTS, frame-ancestors, permissions-policy (camera/mic only where needed).
- Rate limiting per IP and per principal on auth and expensive endpoints.
- Dependencies reviewed on add: licence, maintenance, size; prefer the platform (Web Crypto, stdlib) over a package.
- Privacy by design: collect the minimum, document every personal field, provide export and delete, biometric-like data (voice, face) processed on-device when possible and never logged.

## Before first deploy

- [ ] Threat model (assets, entry points, trust boundaries) in `docs/adr/` or `docs/security.md`
- [ ] Auth and authz tests for every role incl. "other user's object" (BOLA)
- [ ] `npm audit --omit=dev` / `pip-audit` clean or exceptions documented
- [ ] Security headers verified with a scan (observatory/securityheaders)
- [ ] Backups + tested restore; secret rotation procedure in runbook
- [ ] Logging reviewed for PII

Sources: OWASP Top 10:2025 (owasp.org/Top10/2025); OWASP ASVS 5.0 (May 2025); OWASP Cheat Sheet Series; Mozilla Web Security Guidelines; GDPR and the local data-protection law of each market served.

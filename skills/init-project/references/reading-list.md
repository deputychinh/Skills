# Reading list (the canon this skill distils)

## Architecture and code

- Robert C. Martin, _Clean Architecture_ (2017) — dependency rule, boundaries, screaming architecture.
- Eric Evans, _Domain-Driven Design_ (2003); Vaughn Vernon, _Implementing DDD_ (2013) — bounded contexts, aggregates, ubiquitous language.
- Martin Fowler, _Patterns of Enterprise Application Architecture_ (2002); _Refactoring_ 2nd ed. (2018).
- Sam Newman, _Building Microservices_ 2nd ed. (2021); Chris Richardson, _Microservices Patterns_ (2018) — outbox, saga, when not to split.
- Mark Richards & Neal Ford, _Fundamentals of Software Architecture_ (2020) — architecture characteristics, trade-offs, ADRs.
- Gang of Four, _Design Patterns_ (1994) — use sparingly, name honestly.

## Data, distributed systems, reliability

- Martin Kleppmann, _Designing Data-Intensive Applications_ (2017).
- Michael Nygard, _Release It!_ 2nd ed. (2018) — stability patterns.
- Betsy Beyer et al., _Site Reliability Engineering_ (2016) and _The SRE Workbook_ (2018) — SLOs, error budgets, postmortems.
- Alex Petrov, _Database Internals_ (2019) — when indexes and storage engines matter.

## APIs

- Zalando RESTful API and Event Guidelines — opensource.zalando.com/restful-api-guidelines.
- Microsoft REST API Guidelines; Google API Improvement Proposals (aip.dev).
- RFC 9457 Problem Details; RFC 9110 HTTP Semantics; OpenAPI 3.1; AsyncAPI.
- Kevin Hoffman, _Beyond the Twelve-Factor App_ (2016); 12factor.net.

## Security and privacy

- OWASP Top 10:2025; OWASP ASVS 5.0 (2025); OWASP Cheat Sheet Series; OWASP API Security Top 10 (2023).
- Mozilla Web Security Guidelines; NIST SP 800-63B (authentication).
- GDPR for EU users, plus the data-protection law of every country the product serves (for example Vietnam Decree 13/2023/ND-CP, Brazil LGPD, California CCPA).

## Frontend, UX, accessibility

- Material Design 3 (m3.material.io) incl. adaptive layouts and M3 Expressive (2025); Apple Human Interface Guidelines.
- WCAG 2.2 (W3C, 2023); WAI-ARIA Authoring Practices.
- Don Norman, _The Design of Everyday Things_ (rev. 2013); Steve Krug, _Don't Make Me Think_ (2014); Nielsen Norman Group articles (heuristics, forms, navigation).
- Brad Frost, _Atomic Design_ (2016); design tokens (W3C Design Tokens Community Group format).
- web.dev Core Web Vitals (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75); _High Performance Browser Networking_ (Grigorik).

## Process and delivery

- Nicole Forsgren, Jez Humble, Gene Kim, _Accelerate_ (2018); DORA reports (2024, 2025).
- Jez Humble & Dave Farley, _Continuous Delivery_ (2010); Dave Farley, _Modern Software Engineering_ (2021).
- Kent Beck, _Test-Driven Development by Example_ (2002); Freeman & Pryce, _Growing Object-Oriented Software, Guided by Tests_ (2009).
- Nygard, "Documenting Architecture Decisions" (2011); Simon Brown, C4 model; conventionalcommits.org; keepachangelog.com; semver.org.
- Titus Winters et al., _Software Engineering at Google_ (2020) — code review, testing culture, monorepo tooling.

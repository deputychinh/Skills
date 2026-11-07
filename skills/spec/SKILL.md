---
name: spec
description: Defines what "done" means for a brief or a clear request — story map, acceptance criteria in EARS or Given/When/Then with negative and boundary cases, measurable quality targets (workload, data, percentile, environment), non-goals — and checks the spec for ambiguity, gaps and contradictions. Use before planning or code, whenever "done" is fuzzy or a request says "fast", "secure" or "easy" without a number, or to review an existing spec or user stories. Not the entry point for a request to build something — `ship` calls this skill after `discover` and before `architect` and `shape-plan`.
---

# spec — what and why, testable, never how

Output: `docs/delivery/<NNN-slug>/spec.md` from `templates/spec.md` (Small path: only the stories,
criteria and non-goals sections — plus quality targets when the request is about speed, size or cost,
because "make it faster" has no done line without a number and a baseline). For repos with `docs/stories/`, each backlog item later gets its own
story; this spec is the parent.

## Steps

1. **Story map**: backbone of user activities left to right; stories under each; draw a horizontal
   line for release 1 = the thinnest slice that delivers the brief's headline. Everything below the
   line is later.
2. **Stories** as placeholders for a conversation: "As <actor>, I want <capability>, so that <impact
   from the brief>". INVEST check per story; split any that fail "Small" or "Testable".
3. **Acceptance criteria** with ids (`AC1…`), each one an observable example:
   - behaviour: `WHEN <event> [WHILE <state>] THE SYSTEM SHALL <response>` (EARS) or Given/When/Then;
   - include the negative and boundary cases (empty, too long, wrong type, offline, unauthorised, concurrent).
     Use the domain's own words (ubiquitous language) and keep a glossary for terms that could be misread.
4. **Quality targets** with numbers — each with its workload, data size, percentile and environment
   (the table's columns), written into `benchmarks/plan.md` with `benchmark` part B — only the 3–7
   that drive the design; a target without its workload cannot be measured twice the same way: e.g. LCP ≤ 2.5 s, p95 API
   ≤ 300 ms, WCAG 2.2 AA, availability, data retention, cost per request for AI calls.
5. **Non-goals** and **no-gos**: what we will not build and the rabbit holes we will avoid.
6. **Unknowns** marked `[NEEDS CLARIFICATION: …]`, never guessed. Resolve each by reading, a spike, a
   ruling (recorded), or — only if nobody else can — one question to the user.
7. **Spec checklist** ("unit tests for English"), all must pass:
   - every AC is testable by a machine or a clearly described manual check;
   - no AC says how (no table names, frameworks, endpoints) unless it is an external contract;
   - every story traces to the brief's goal; every brief deliverable has a story;
   - no two ACs contradict; vague words (fast, easy, intuitive, robust) are replaced by numbers;
   - each AI-dependent behaviour states its fallback when the model is wrong, slow or unavailable.

## Anti-patterns

Flat backlogs that lose the journey; scripts instead of examples; wireframes too early; specs frozen
after the first build — update the spec when you learn, and note the change.

Sources: Patton _User Story Mapping_; Adzic _Specification by Example_; Mavin et al. EARS; GitHub
spec-kit `clarify`/`checklist`; Kiro specs — see the `ship` skill's references.

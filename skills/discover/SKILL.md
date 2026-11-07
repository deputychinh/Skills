---
name: discover
description: Turns an idea into a one-page brief — press release and FAQ, the five customer questions, an impact map, the riskiest hypothesis and an appetite — or kills it with a reason. Use when a request is still a wish or a vague product idea and nobody has written down who it is for, what problem it solves and how success is measured. Not the entry point for a request to build something — `ship` calls this skill.
---

# discover — turn a request into a brief worth building

Output: `docs/delivery/<NNN-slug>/brief.md` from `templates/brief.md`. One page. It is also the demo
script at the end, so write it as if the product shipped today.

**Light mode** (`ship`'s Small new path): steps 2–4, 8 and 9 and a one-line headline only — no press
release body, FAQ, impact map or four-risk list.

## Steps

1. **Benchmark the job**: for a product or a feature people already use elsewhere, run `benchmark`
   part A on 2–3 reference products and keep only the rows that change a decision.
2. **Read what exists**: the request verbatim, the repo (README, docs/plan.md, CLAUDE.md), anything David
   linked. Note facts vs. guesses.
3. **Five customer questions** (Working Backwards): who is the customer; what problem; what is the
   benefit; how do we know they need it; what does the experience look like. Answer from facts; mark
   the rest `HYPOTHESIS:`.
4. **Ask, once, only what blocks**: these questions join `ship`'s single triage question (≤ 4 in all),
   ranked by impact × uncertainty, each multiple choice with your recommended option first. Skip any you can answer by reading or by
   a reasonable default — record the default as a ruling in `status.md`. Never ask about technology
   choices David does not care about.
5. **Press release + FAQ**: headline, one-paragraph problem, one-paragraph solution, a customer quote
   (marked illustrative), how to start; external FAQ (users) and internal FAQ (cost, risk, what we will
   not do).
6. **Impact map line**: goal (measurable) → actor → behaviour change → deliverable. Every deliverable
   must trace to the goal; drop the ones that do not.
7. **Riskiest assumption** as a falsifiable hypothesis with a metric and how the demo will show it.
   Check the four risks: value, usability, feasibility, viability — one line each.
8. **Appetite**: how much work this is worth (e.g. "1 day", "3 cycles"), set before solution design.
9. **Kill or go**: if no credible press release can be written, say so in `status.md` and tell David why
   in three lines. Otherwise mark Discover done.

## Anti-patterns

- A feature list instead of a problem (feature factory). Vanity metrics. Starting from a technology.
- Invented numbers presented as facts. Questions whose answer does not change the plan.

Sources: Bryar & Carr _Working Backwards_; Cagan _Inspired_; Adzic _Impact Mapping_; Ries _The Lean
Startup_; Singer _Shape Up_ — details in [`../ship/references/sdlc-checklists.md`](../ship/references/sdlc-checklists.md).

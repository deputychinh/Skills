---
name: demo
description: Builds a short results page for finished, verified work — what David can open now, evidence per acceptance criterion, what was cut and why, how to run it — publishes or opens it and starts the app. Use when a request, release or milestone is done and David should see the result.
---

# demo — show working software against the brief

Input: `brief.md` (the press release is the script), `spec.md`, `verify-app` evidence, `status.md`,
`git log`. Output: `docs/delivery/<NNN-slug>/demo.md` from `templates/demo.md`, a page David can open,
and the app running locally.

## Steps

1. **Start the app** the README way and leave it running; note the URLs.
2. **Write `demo.md`**:
   - headline from the press release, then "what you can do now" as 3–7 bullets, each linked to its
     evidence (screenshot or command output) and its AC ids;
   - how to run it (≤ 5 commands) and where it is deployed, if anywhere;
   - what was cut and why (scope hammering is normal; hiding it is not);
   - hypothesis result, or how it will be measured if not measurable yet;
   - delivery numbers: commits, items shipped, review scores, lead time from request to demo;
   - known issues and the next slice.
3. **Make it visible**:
   - If an Artifact tool is available, publish the demo as a page (load `artifact-design` first;
     embed the screenshots) and give David the link.
   - Otherwise render `demo.md` to `demo.html` next to it and `open` it.
   - Also `open` the running app's URL.
4. **Collect feedback for the next slice**: what David says, the hypothesis metric, the benchmark
   diff — write them into `status.md` (Slices table) so `ship` can re-plan before the next slice.
5. **Message David** in Vietnamese, ≤ 12 lines: the link, the app URL and run command, what works,
   what was cut, what is next. No percent-complete; no slides of things that do not run.

## Anti-patterns

Demoing mocks or slides; success theatre (only the happy path); reporting features without the
outcome; burying cuts and known issues.

Sources: Scrum Guide 2020 (Sprint Review); Bryar & Carr _Working Backwards_ (PR/FAQ as the yardstick);
Singer _Shape Up_ (scope hammering, hill charts); Ries _The Lean Startup_ (validated learning).

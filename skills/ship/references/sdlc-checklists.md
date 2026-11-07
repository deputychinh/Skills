# SDLC practices from the canonical books, as checklists for agent skills

Each item is a paraphrase written as an instruction and tagged with its source. Some facts were checked against primary sources (Nov 2026): basecamp.com/shapeup, dora.dev/guides/dora-metrics, scrumguides.org (2020), workingbackwards.com. The rest summarises the books from established knowledge. Check a quote against the book before you cite it as verbatim.

---

## 1. Discover (intake, problem framing)

- [ ] Restate the request as a customer problem and an outcome to change, not as a list of features. [Cagan, _Inspired_]
- [ ] Before any build, check the four product risks: value, usability, feasibility, business viability. [Cagan, _Inspired_]
- [ ] Draft a one-page press release (heading, subheading, problem, solution, quotes) plus external and internal FAQs. [Bryar & Carr, _Working Backwards_]
- [ ] Build an impact map (Goal, then Actors, then Impacts on behaviour, then Deliverables) so every deliverable traces to a measurable goal. [Adzic, _Impact Mapping_]
- [ ] Write down the riskiest assumptions as falsifiable hypotheses, each with a metric. [Ries, _The Lean Startup_]
- [ ] Define the MVP as the smallest experiment that completes one Build-Measure-Learn loop. [Ries, _The Lean Startup_]
- [ ] Set an appetite (the time you are willing to spend) before you design the solution. [Singer, _Shape Up_]
- [ ] Use actionable metrics (cohorts, split tests) rather than vanity totals. [Ries, _The Lean Startup_]

**Anti-patterns:** treating the roadmap as a list of features to deliver, which Cagan calls "feature factories" and contrasts with empowered product teams [Cagan]. Vanity metrics, and building before you have validated anything [Ries]. Starting from a technology and looking for customers to fit it [Bryar & Carr]. Deliverables that trace back to no goal [Adzic, _Impact Mapping_].

## 2. Define / Spec

- [ ] Map the user journey as a backbone of activities, put the stories under each one, then slice horizontally into releases. [Patton, _User Story Mapping_]
- [ ] Treat stories as placeholders for conversation (Card, Conversation, Confirmation), not as contracts. [Patton, _User Story Mapping_]
- [ ] Derive scope from goals and turn acceptance criteria into concrete key examples. [Adzic, _Specification by Example_]
- [ ] Write the examples as executable specifications (Given/When/Then) that become living documentation. [Adzic, _Specification by Example_]
- [ ] Shape the work at the right altitude: a pitch with problem, appetite, solution sketch (breadboards or fat-marker drawings), rabbit holes and no-gos. [Singer, _Shape Up_]
- [ ] Use the customer's domain language in specs and code alike (ubiquitous language). [Evans, _DDD_]
- [ ] State the quality attributes (performance, availability, security, accessibility) with measurable targets. [Richards & Ford, _Fundamentals of Software Architecture_]

**Anti-patterns:** a flat backlog that loses the big picture, and "shared documents are not shared understanding" [Patton]. Writing scripts instead of specifications, and test-level detail in specs [Adzic]. Under-shaped work (too vague) or over-specified work (wireframes too early) [Singer].

## 3. Plan & estimate

- [ ] Estimate in ranges and say how confident you are. A single number is a target or a commitment, not an estimate. [McConnell, _Software Estimation_]
- [ ] Count and compute from historical data before you fall back on judgement. [McConnell, _Software Estimation_]
- [ ] Expect early estimates to be wide (Cone of Uncertainty), and re-estimate at milestones. [McConnell, _Software Estimation_]
- [ ] Fix the time and vary the scope. Cut the "nice-to-haves" (~) and keep the core. [Singer, _Shape Up_]
- [ ] Set a circuit breaker: work that misses its cycle is cancelled by default, not extended. [Singer, _Shape Up_]
- [ ] Pick one goal per iteration (Product Goal, then Sprint Goal) and a Definition of Done. [Schwaber & Sutherland, _Scrum Guide 2020_]
- [ ] Visualise the workflow, limit work-in-progress, and pull new work only when there is capacity. [Anderson, _Kanban_]
- [ ] Rank the risks and tackle the riskiest unknowns first. [McConnell, _Rapid Development_]

**Anti-patterns:** adding people to a late project, which makes it later (Brooks's Law), and "the man-month" as an interchangeable unit [Brooks]. Treating estimates as commitments, and wishful scheduling [McConnell]. Unlimited WIP that hides bottlenecks [Anderson]. "Backlogs are a big weight" that you groom forever [Singer].

## 4. Architect

- [ ] List the 3–7 driving architecture characteristics and leave out the rest. Pick the least-worst architecture, not the best. [Richards & Ford, _FoSA_]
- [ ] Record every significant decision as an ADR (context, decision, consequences, status). "Why" matters more than "how". [Richards & Ford, _FoSA_; Nygard ADR format]
- [ ] Draw bounded contexts and a context map, and model the core domain carefully while buying or simplifying generic subdomains. [Evans, _DDD_; Khononov, _Learning DDD_]
- [ ] Classify subdomains (core, supporting, generic) and match the implementation pattern to each one. [Khononov, _Learning DDD_]
- [ ] Point dependencies inward. Keep entities and use cases free of frameworks, UI and DB, and keep those details behind boundaries. [Martin, _Clean Architecture_]
- [ ] Design deep modules: a simple interface over a powerful implementation that hides information. [Ousterhout, _A Philosophy of Software Design_]
- [ ] For data, decide on reliability, scalability and maintainability in explicit terms. Choose the consistency, replication and partitioning model on purpose. [Kleppmann, _DDIA_]
- [ ] Specify idempotency, ordering, and the source of truth versus derived data for every data flow. [Kleppmann, _DDIA_]
- [ ] Add timeouts, circuit breakers, bulkheads and back-pressure at every integration point. [Nygard, _Release It!_]

**Anti-patterns:** the Big Ball of Mud, and an anemic model without a ubiquitous language [Evans]. Frameworks dictating the architecture, and the database at the centre [Martin]. Shallow modules and "classitis" [Ousterhout]. Distributed transactions taken for granted, and confusing replication with backup [Kleppmann]. Choosing architecture by fashion, ignoring trade-offs [Richards & Ford].

## 5. Build

- [ ] Work in tiny steps: red, green, refactor. Write a failing test, make it pass simply, then clean up. [Beck, _TDD by Example_]
- [ ] Keep a test list, and take smaller steps whenever you feel unsure. [Beck, _TDD by Example_]
- [ ] Start each feature with a walking skeleton (the thinnest end-to-end slice, deployed) and an acceptance test written outside-in. [Freeman & Pryce, _GOOS_]
- [ ] Use mocks for roles you own ("mock roles, not objects") and listen to the tests when they are hard to write. [Freeman & Pryce, _GOOS_]
- [ ] Refactor in small behaviour-preserving steps, with the tests green, to remove code smells. Use the "make the change easy, then make the easy change" rhythm. [Fowler, _Refactoring_ 2e; Beck]
- [ ] Keep it DRY (knowledge, not text), make code orthogonal, use tracer bullets, and fix broken windows straight away. [Hunt & Thomas, _The Pragmatic Programmer_]
- [ ] Before you change legacy code, add characterisation tests at a seam, then change it. [Feathers, _Working Effectively with Legacy Code_]
- [ ] Manage complexity first: use good names, keep routines short, program defensively at the boundaries, and use pseudocode before code. [McConnell, _Code Complete 2_]
- [ ] Commit to trunk at least daily, behind feature flags when needed. [Humble & Farley, _Continuous Delivery_; DORA]

**Anti-patterns:** big leaps without tests, and writing the test after the fact [Beck]. Mocking third-party types, and testing internals [Freeman & Pryce]. Mixing refactoring with feature work in one step [Fowler]. "Edit and pray" [Feathers]. Programming by coincidence [Hunt & Thomas]. Tactical programming that piles up complexity [Ousterhout].

## 6. Test

- [ ] Automate the testing in layers: many fast unit tests, fewer integration tests, few end-to-end tests. [Winters et al., _SE at Google_; Humble & Farley]
- [ ] Make the executable specifications from the Define phase the acceptance suite. [Adzic, _Specification by Example_]
- [ ] Keep tests hermetic, deterministic and fast. Treat flaky tests as bugs. [Winters et al., _SE at Google_]
- [ ] Test through public APIs and state, not through interactions with internals. [Winters et al., _SE at Google_]
- [ ] Turn every defect into a failing regression test before you fix it. [Beck; Feathers]
- [ ] Test the non-functional characteristics as fitness functions (performance, security, accessibility). [Richards & Ford; Ford et al., _Building Evolutionary Architectures_]
- [ ] Test failure modes: slow responses, dropped connections, full disks. [Nygard, _Release It!_]
- [ ] Use experiments and empirical feedback to reduce uncertainty, and optimise for learning. [Farley, _Modern Software Engineering_]

**Anti-patterns:** the "ice-cream cone", with mostly manual or end-to-end tests [Winters et al.]. Brittle tests coupled to the implementation [Freeman & Pryce]. Integration tested only in staging, and a "QA phase" at the end [Humble & Farley].

## 7. Review

- [ ] Keep changes small and focused, and give each one a description that says why. [Winters et al., _SE at Google_]
- [ ] Make review check correctness, comprehension, consistency and knowledge sharing, not only style. Automate the style checks. [Winters et al., _SE at Google_]
- [ ] Watch for complexity symptoms: change amplification, cognitive load, unknown unknowns. [Ousterhout, _APoSD_]
- [ ] Look for smells (long function, duplicated code, feature envy, shotgun surgery) and name the refactoring that fixes each. [Fowler, _Refactoring_]
- [ ] Confirm that the Definition of Done is met: tests, docs, deployable. [Scrum Guide 2020]
- [ ] Prefer fast peer review to heavyweight change-approval boards. [Forsgren et al., _Accelerate_]

**Anti-patterns:** external change-approval boards, which Accelerate links to lower stability as well as lower speed [Forsgren et al.]. Giant diffs, and rubber-stamp reviews [Winters et al.].

## 8. Release

- [ ] Build one deployment pipeline (commit stage, acceptance, production) and promote the same artifact through every stage. [Humble & Farley, _Continuous Delivery_]
- [ ] Keep everything in version control: code, config, infrastructure, schema migrations. [Humble & Farley]
- [ ] Keep the software releasable at all times. If the pipeline breaks, stop and fix it. [Humble & Farley]
- [ ] Separate deploy from release with flags, dark launches, canaries and blue/green. [Humble & Farley; Nygard]
- [ ] Track the DORA metrics: change lead time, deployment frequency, failed deployment recovery time, change fail rate, deployment rework rate. [DORA, dora.dev]
- [ ] Ship small batches often. Throughput and stability improve together. [Forsgren et al., _Accelerate_]
- [ ] Make deploys zero-downtime, and use expand/contract (parallel change) migrations. [Nygard, _Release It!_]
- [ ] Rehearse the rollback, or make roll-forward cheap. [Humble & Farley; Beyer et al., _SRE_]

**Anti-patterns:** manual, snowflake deploys and environments, and long-lived release branches [Humble & Farley]. Big-bang releases, and a "deployment army" [Nygard]. Trading speed against stability, which the data rejects [Forsgren et al.].

## 9. Operate

- [ ] Define SLIs and SLOs from the user's point of view, and spend an error budget to decide on release pace or reliability work. [Beyer et al., _SRE_]
- [ ] Alert on symptoms (the four golden signals: latency, traffic, errors, saturation), not causes, and make every page actionable. [Beyer et al., _SRE_]
- [ ] Cap toil (~50%) and automate repetitive operations work. [Beyer et al., _SRE_]
- [ ] Put the stability patterns in place: timeouts, circuit breaker, bulkhead, steady state, fail fast, shed load. [Nygard, _Release It!_]
- [ ] Build in transparency from the start: logs, metrics and traces. [Nygard, _Release It!_]
- [ ] Run incident response with clear roles, and write blameless postmortems with action items. [Beyer et al., _SRE_]
- [ ] Remember that every observable behaviour will be depended on (Hyrum's Law), and plan deprecations. [Winters et al., _SE at Google_]

**Anti-patterns:** integration points without timeouts, cascading failures, and unbounded result sets [Nygard]. Aiming for 100% reliability, and noisy alerts [Beyer et al.].

## 10. Learn / Retro

- [ ] Measure the outcome against the hypothesis, then pivot or persevere. [Ries, _The Lean Startup_]
- [ ] Hold a retrospective each cycle and turn it into one or two concrete improvements. [Scrum Guide 2020]
- [ ] Use flow metrics (lead time, throughput, WIP) and evolve the process step by step. [Anderson, _Kanban_]
- [ ] Use DORA capabilities (CI, trunk-based development, loose coupling, generative culture) as the improvement backlog. [Forsgren et al., _Accelerate_]
- [ ] Feed postmortem actions back into the backlog and track them to done. [Beyer et al., _SRE_]
- [ ] Throw the first version away on purpose, as a pilot to learn from. [Brooks, _MMM_]

**Anti-patterns:** the "second-system effect", which over-engineers the next version [Brooks]. Retros with no action items. Measuring individual productivity instead of system outcomes [Forsgren et al.].

## 11. Demo / communicate results

- [ ] Demo the working increment to stakeholders against the goal, and collect feedback that changes the backlog. [Scrum Guide 2020, Sprint Review]
- [ ] Present the outcome against the press release and FAQ you wrote at intake. [Bryar & Carr]
- [ ] Use narrative memos over slides for decisions (Amazon's six-pager). [Bryar & Carr]
- [ ] Show progress on hill charts: unknowns ("uphill") versus execution ("downhill"). [Singer, _Shape Up_]
- [ ] Report the validated learning (what we now know), not only the features shipped. [Ries]
- [ ] Show the living documentation and examples as proof of behaviour. [Adzic, _Specification by Example_]
- [ ] Be honest about what was cut and why (scope hammering). [Singer]

**Anti-patterns:** demoing slides or mocks instead of working software, and success theatre [Ries; Scrum]. Reporting percent-complete [Singer; McConnell].

---

## Minimal viable process for a solo developer + AI agent

1. **Intake:** a one-page PR/FAQ, plus an impact map line (goal, actor, impact, deliverable), plus one falsifiable hypothesis. [Bryar & Carr; Adzic; Ries]
2. **Shape:** set an appetite (1–2 weeks or 6 weeks). Write a pitch with no-gos and rabbit holes, and a story-map backbone that names the first release slice. [Singer; Patton]
3. **Spec:** 3–7 key examples per story, written as Given/When/Then, plus measurable quality attributes. [Adzic; Richards & Ford]
4. **Architect:** one ADR per significant decision. Draw bounded contexts, point dependencies inward, and put timeouts on every external call. [Richards & Ford; Evans; Martin; Nygard]
5. **Skeleton first:** deploy a walking skeleton through a CI pipeline on day 1. [Freeman & Pryce; Humble & Farley]
6. **Build:** work outside-in with TDD in small commits on trunk, and refactor only when green. [Beck; Fowler]
7. **Gate:** lint, types, tests and coverage; the acceptance specs pass; review a small diff for complexity smells. [Winters et al.; Ousterhout]
8. **Release:** use one artifact, a feature flag for risky changes, and a tested rollback. [Humble & Farley]
9. **Operate:** one user-facing SLO, structured logs, and alerts on symptoms only. [Beyer et al.; Nygard]
10. **Demo:** show working software against the PR/FAQ, state what was cut, and give the hypothesis result. [Scrum Guide; Singer; Ries]
11. **Retro:** check the DORA numbers, record 1–2 improvements, and decide whether to pivot or persevere. [DORA; Ries]
12. **WIP = 1:** finish before you start. The circuit breaker cancels work that overruns its appetite. [Anderson; Singer]

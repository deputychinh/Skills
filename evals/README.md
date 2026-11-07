# Evals

End-to-end scenarios the skills must handle, in skill-creator's case-folder layout (the format
`claude plugin eval` reads). Each case is a folder:

- `prompt.md` — a settings block, then the request exactly as a user would type it;
- `case.yaml` — schema version, name and the expected outcome in prose (fixture described here);
- `graders/NN-*.md` — one objectively checkable statement per file, judged against the transcript and
  the files the run leaves behind;
- `files/` + `place-files.sh` — the starting repository, when the case needs one. The script copies
  `files/` into the run folder and builds the git history the case needs (tags, commits).

| Case                                          | Starting point                                                    | Skills exercised                                                                           | Last run | Result |
| --------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- | ------ |
| [expense-app-vue-node](expense-app-vue-node/) | empty folder, no git                                              | ship (Small new), discover, spec, init-project, shape-plan, deliver-loop, verify-app, demo | –        | –      |
| [slow-list-2000-items](slow-list-2000-items/) | React + FastAPI orders app; list loads all rows with an N+1 query | ship (Performance), benchmark, cache-optimize, deliver-loop, verify-app, demo              | –        | –      |
| [bug-after-deploy](bug-after-deploy/)         | FastAPI orders API with tags v1.0.0 (good) and v1.1.0 (broken)    | ship (Incident), monitor, fix-bug, deliver-loop, release                                   | –        | –      |
| [resume-from-ledger](resume-from-ledger/)     | open delivery ledger whose Next action is a failing test for AC3  | ship ("Where am I?"), deliver-loop                                                         | –        | –      |

## Running a case

By hand: make an empty folder, run the case's `place-files.sh` there (if it has one), open a **fresh**
Claude Code session in it (no history, no delivery profile unless the case adds one) and paste the
body of `prompt.md`. Then grade each file in `graders/` as pass or fail with evidence from the
transcript or the files, and record the pass rate in the table above.

With the CLI (real, billed model runs), from the repo root: `claude plugin eval evals --scaffold
--allow-tools Write,Edit,Bash` — it runs each case with and without the skills.

Re-run the affected cases after any change to the skills they exercise. When a skill's text led a
run astray, add a case (or a grader) that would have caught it before fixing the text.

# App Review notes — {{APP_NAME}} {{VERSION}} ({{BUILD}})

Paste the "Notes" part into App Store Connect → App Review Information. Keep the checklist in the
release note.

## Notes for the reviewer

- What the app does in one sentence: {{ONE_SENTENCE}}
- Demo account: {{DEMO_USER}} / password in the App Review Information fields (never in this file).
- How to reach the new feature: {{STEPS}}
- Account deletion path: {{DELETE_ACCOUNT_PATH}}
- Permissions and why: {{PERMISSION}} — {{REASON}}; the app works when it is denied.
- Hardware or region needs, if any: {{NEEDS}}
- In-app purchases in this version and where to find them: {{IAP}}

## Pre-submission checklist

- [ ] Accepted Xcode/SDK, deployment target ≥ store minimum, launch screen present
- [ ] Version and build number increased; tag matches
- [ ] Privacy manifest current (app and SDKs); privacy report matches the nutrition labels
- [ ] Purpose strings present and specific
- [ ] Privacy policy link in app and in metadata
- [ ] Login rule (4.8) and account deletion (5.1.1(v)) satisfied
- [ ] Backend for the demo account is up and seeded
- [ ] Screenshots and "What's New" reflect this version
- [ ] Phased release selected; feature flags ready to switch off risky features

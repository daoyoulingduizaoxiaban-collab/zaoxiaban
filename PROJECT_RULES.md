# PROJECT_RULES

## Read Order For Every New Work Session
1. `CURRENT_TASKS.md`
2. `PROJECT_RULES.md`
3. `MVP_COMPLETION_CHECKLIST.md`
4. `ACCEPTANCE.md`
5. `HANDOFF.md`
6. `DATA_LAYER_DECISION.md`
7. `DATA_MODEL_AND_PERMISSIONS.md`
8. `QA_SEED_REQUIREMENTS.md`

Do not rely on chat memory.

## Product Definition
- WeChat mini program for China-based guides/tour leaders.
- Core terms: `开团`, `团单`, `本团商品`, `商品库`, `客户订单`, `收款状态`.
- First real MVP focuses on guide/tour-leader workflow only.
- Customer, supplier, and admin capabilities stay minimal until explicitly scoped.

## Current Technical Truth
- The app is in mixed mode: formal WeChat Cloud login and core business cloud persistence are connected; mock identities still use QA/local fallback.
- `config.js` has `isMock: true`, `baseUrl: ''`, and `cloudEnvId: 'cloud1-3gwlqssy1f1972a9'`.
- Formal data layer direction is confirmed by the user: WeChat Cloud Database + Cloud Functions behind service/repository boundaries.
- Formal OpenID is verified through deployed `authLogin`.
- Cloud `users` profile initialization is verified for the current OpenID.
- Group order persistence has cloud repository plus local/QA fallback.
- Product library persistence has cloud repository plus local/QA fallback.
- Phase 5 customer ordering/payment workflow has cloud repository plus local/QA fallback.

## Architecture Rules
- Pages call services/repositories, not raw storage, cloud database, cloud functions, or `mock/qaSeed.ts` for business operations.
- `mock/qaSeed.ts` is QA/test data only.
- Local/mock fallback must be visibly labeled as local/QA/demo mode.
- Do not present local storage as formal persistence.
- Do not present auth adapter/mock OpenID as formal WeChat OpenID.
- Owner/admin roles must not be self-assigned by the front end in formal auth; use cloud-function controlled allowlists such as `OWNER_OPENIDS` / `ADMIN_OPENIDS`.

## UI And Copy
- UI copy uses Simplified Chinese.
- Keep the interface work-focused and operational.
- Avoid TDesign starter wording and unrelated concepts.
- Unfinished entries must show a clear unfinished/local/QA prompt.

## Forbidden Without Explicit User Request
- Start, restart, refocus, or preview WeChat DevTools.
- Use `automator.launch(...)`.
- Push remote branches.
- Deploy.
- Create cloud resources, except when the user explicitly authorizes the specific cloud task.
- Delete production data.
- Install new packages.
- Use network.
- Submit `resume/preview-info.json` or `resume/preview-qr.png`.
- Extend Phase 5 beyond the scoped MVP customer order/payment workflow.

## Required Validation
```bash
git status --short --branch
npm run lint
git diff --check
```

GUI validation must only be claimed after actual WeChat DevTools or device testing.

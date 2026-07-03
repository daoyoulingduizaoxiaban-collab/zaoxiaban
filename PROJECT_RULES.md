# PROJECT_RULES

## Read Order For Every New Work Session
1. `PROJECT_RULES.md`
2. `BUSINESS_LOGIC_PRINCIPLES.md`
3. `MVP_COMPLETION_CHECKLIST.md`
4. `ACCEPTANCE.md` only when the task needs current validation status.

`BUSINESS_LOGIC_PRINCIPLES.md` is the only business-logic source of truth. Use `MVP_COMPLETION_CHECKLIST.md` only as the MVP gate / backlog / product-completion reference. Use `QA/QA_BUG_REPORT_202607021815.md` only when explicitly fixing current QA not-pass rows.

QA and AGENT must not create extra planning, result, matrix, or progress documents unless the user explicitly asks. QA reports only current `不通過` rows in the BUG report. AGENT fixes product code, validates the fix, then hands the changed code back for QA verification.

Do not rely on chat memory.

## Product Definition
- WeChat mini program for China-based 团主 users.
- Core terms: `开团`, `团单`, `本团商品`, `商品库`, `客户订单`, `收款状态`.
- MVP business logic is defined in `BUSINESS_LOGIC_PRINCIPLES.md`.
- Provider is a formal MVP role, not a future placeholder.
- Customer logic must distinguish direct registration from restricted share-ordering, and one OpenID may have multiple scenario roles.

## Current Technical Truth
- The app is in mixed mode: formal WeChat Cloud login and core business cloud persistence are connected; mock identities still use QA/local fallback.
- `config.js` currently has `isMock: false`, `baseUrl: ''`, `cloudEnvId: 'cloud1-3gwlqssy1f1972a9'`, and `useCloudBusinessData: true`.
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
- Formal users must not see unavailable, unscoped, QA-only, local-only, or unfinished function entries. Hide those entries by role/status instead of exposing disabled buttons, unfinished prompts, QA/local/test/Seed/mock copy, or roadmap wording.
- Local/mock/QA fallback surfaces must be visibly labeled as local/QA/demo mode when they are intentionally available in a QA context.

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
- Add business scope beyond `BUSINESS_LOGIC_PRINCIPLES.md` or `MVP_COMPLETION_CHECKLIST.md` without explicit user approval.

## Required Validation
```bash
git status --short --branch
npm run lint
git diff --check
```

Validation method depends on the runner. CLI agents may use CLI, scripts, automation, static checks, and available DevTools automation. Codex App agents, when they are performing user-facing QA or claiming UI/product behavior, must actually operate the mini program through the WeChat DevTools interface or a real device. Static checks, route existence, screenshots alone, automation connection state, or written claims are not enough for Codex App to mark any UI/product row `通過`.

Never write `GUI 證據不足`, `缺少 GUI 證據`, `待複測`, `未驗證`, `blocked`, `partial`, or equivalent proof-shortage wording in the BUG report. A row is either `通過` and removed from the current BUG report, or it remains `不通過` with a concrete fixable problem.

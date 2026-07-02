# HANDOFF

## Codex Entry Snapshot

- Canonical path: `/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- Current branch observed: `codex`
- Dirty status expected: dirty as of 2026-07-02; do not overwrite existing QA screenshots, bug report edits, or `pages/dataCenter` edits unless they are in scope.
- Start here: `NEXT_AGENT_TASK.md`
- Current next action: confirm dirty state, read `QA/QA_BUG_REPORT_202607021815.md`, then continue Phase 7 GUI smoke/retest evidence if requested.
- Current QA plan: `QA/QA_DETAILED_RETEST_PLAN_20260702.md`.
- Next QA result table: `QA/QA_DETAILED_RETEST_RESULTS_20260702.md`.
- Latest detailed retest attempt: pre-flight completed, but DevTools automation websocket was not connectable; see `QA/QA_DETAILED_RETEST_RESULTS_20260702.md`.
- Done definition: files changed + validation run + checklist/acceptance/handoff updated + unverified items listed.

## Current Source Of Truth
- Short Codex entry: `NEXT_AGENT_TASK.md`.
- Current task source: `CURRENT_TASKS.md`.
- Product rules: `PROJECT_RULES.md`.
- MVP roadmap, partially completed items, and missing backlog: `MVP_COMPLETION_CHECKLIST.md`.
- Acceptance status: `ACCEPTANCE.md`.
- Data-layer recommendation: `DATA_LAYER_DECISION.md`.
- Data model and permissions: `DATA_MODEL_AND_PERMISSIONS.md`.
- QA route/data matrix: `QA/QA_SEED_REQUIREMENTS.md`.

## Current State
- Branch: `codex`.
- Product: WeChat mini program for China-based guides/tour leaders to manage group orders.
- Current runtime mode: mixed mode. Formal WeChat Cloud login and core business cloud persistence are connected; mock identities still use QA/local fallback.
- `config.js`: `isMock: true`, `baseUrl: ''`, `cloudEnvId: 'cloud1-3gwlqssy1f1972a9'`.
- Formal data layer direction: user confirmed WeChat Cloud Database + Cloud Functions, behind service/repository boundaries.
- Formal OpenID login: verified through deployed `authLogin`.
- Cloud `users` profile initialization: verified for current OpenID through DevTools automation.
- Phase 3 guide group-order persistence: cloud repository plus local/QA fallback is implemented.
- Product library: Phase 4 cloud repository plus local/QA fallback is implemented.
- Phase 5 customer ordering/payment workflow: cloud repository plus local/QA fallback is implemented.
- WeChat DevTools GUI validation: targeted automation flow passed; full 27-route GUI smoke is still not done.

## Implemented Boundaries
- Auth uses `services/auth/authService.js` and `services/auth/roleScope.js`.
- Formal auth cloud function lives in `cloudfunctions/authLogin`.
- `authLogin` initializes/reads cloud `users` and returns profile/session fields to `AuthService`.
- In formal auth, owner/admin cannot be self-assigned from the front end; configure `OWNER_OPENIDS` / `ADMIN_OPENIDS` in the cloud function environment.
- Core business cloud function lives in `cloudfunctions/businessData`.
- Frontend cloud client lives in `repositories/cloudBusinessRepository.js`.
- Formal OpenID sessions use `businessData`; mock/local identities keep the old local repositories.
- Group orders use `services/groupOrder/groupOrderService.js` and `repositories/groupOrderRepository.js`.
- Group order repository uses cloud persistence when `config.useCloudBusinessData` is true and the current profile is a formal cloud OpenID. Mock fallback saves to `dao_you_ling_local_group_orders`.
- Customer order visibility uses `repositories/customerOrderRepository.js`.
- Product library uses `services/product/productService.js` and `repositories/productRepository.js`.
- Product repository uses cloud persistence for formal OpenID sessions. Mock fallback saves to `dao_you_ling_local_products`.
- Customer ordering uses `services/customerOrder/customerOrderService.js` and `repositories/customerOrderRepository.js`.
- Customer order repository uses cloud persistence for formal OpenID sessions. Mock fallback saves to `dao_you_ling_local_customer_orders`.
- QA seed remains in `mock/qaSeed.ts` for test/demo data only.

## Hard Rules
- Do not start, restart, refocus, or preview WeChat DevTools unless explicitly asked.
- Do not use `automator.launch(...)`.
- Do not push, deploy, create cloud resources, delete production data, install packages, or use network unless explicitly asked. The user explicitly authorized `authLogin` creation/deployment in this session.
- Do not submit `resume/preview-info.json` or `resume/preview-qr.png`.
- Do not describe mock/local fallback as formal OpenID, formal cloud persistence, or a real-user MVP loop.
- Do not extend Phase 5 beyond the current local/QA workflow unless the user explicitly asks for that scope.

## Validation Commands
```bash
git status --short --branch
npm run lint
git diff --check
```

## Known Unverified Items
- Full 27-route GUI smoke test.
- Product image upload through actual `wx.chooseMedia` GUI picker after the cloud upload code path.
- Cloud database console security rules were not separately configured by CLI; permission checks are enforced in `businessData`, and pages do not directly access cloud DB.
- WeChat DevTools route smoke test.
- WeChat DevTools automation connect now works against `ws://127.0.0.1:9420` for targeted login verification; full route smoke is still not done.
- WeChat DevTools `auto-replay --replay-all` completed, but did not produce route-by-route GUI evidence.
- 27-route static file existence check passed.
- Product library GUI flow: create -> list refresh -> status toggle -> soft delete.
- Phase 5 GUI flow: customer entry -> select products -> submit order -> declare paid -> guide confirm/cancel.
- Guide full GUI workflow: group order -> product selection -> reopen.
- Owner/admin allowlist values are not configured.
- Formal guide/customer OpenID isolation remains separate from QA/mock role isolation. The user approved using fake customer IDs for QA/mock isolation, but QA must not report that as formal OpenID verification.
- If useful for automation, a development agent may add a QA-only identity switch such as `qaRoleOverride` / `qaOpenIdOverride`. It must be limited to `isMock: true` or an explicit QA mode and must not affect formal WeChat OpenID permissions.
- The QA-only identity switch should cover the current role set that can appear in the system: `guide`, `customer`, `owner`, `admin`, and `provider`. For this MVP gate, `guide` and `customer` are the required pass/fail roles; `owner`, `admin`, and `provider` are only for checking restricted/read-only/not-open/allowlist boundary states, not for declaring formal backend capability.
- DevTools automation should connect to an existing session first. If the session is unreachable or stuck, restart is allowed, but record the reason in QA evidence/logs.
- "Real image" testing means selecting an image through `wx.chooseMedia`; seed image URLs or hard-coded HTTPS URLs are not enough to verify BUG-002.
- 2026-07-02 22:43 CST: Existing DevTools process was present. `miniprogram-automator.connect` failed on `9420`, `19512`, and `3799`; CLI `auto --port 13521 --auto-port 9420` completed, but connects still failed on `9420`, `13521`, and discovered WeChat/DevTools listening ports. No GUI pass evidence was generated in that attempt.

## Phase 8 Auth Verification
- Cloud environment list returned `cloud1-3gwlqssy1f1972a9`.
- `authLogin` deployed successfully after one retry; final deploy output reported `success: true`, `filesCount: 2`, `packSize: 1.5 KB`.
- `cloud functions info` reported `authLogin` status `Active`, runtime `Nodejs16.13`.
- DevTools automation connected to `ws://127.0.0.1:9420`.
- Calling `/pages/login/login` page method `login()` produced session storage with:
  - `authSource: wechat-cloud`
  - `isMockOpenId: false`
  - `cloudOpenIdVerified: true`
  - `wxLoginCalled: true`
  - `wxLoginCodeAvailable: true`
- The current OpenID was returned and a cloud `users` profile id was created. Do not paste the OpenID into public docs or commits beyond local validation notes.

## Phase 8 Business Cloud Verification
- Deployed `businessData`; `cloud functions info` reported status `Active`, runtime `Nodejs16.13`.
- Targeted DevTools automation used existing page/service/repository paths, not direct page DB calls.
- Verified guide cloud flow:
  - Login as `guide` with `authSource: wechat-cloud`.
  - Create product through `/sub-pages/product/add/index`; result `saveMode: wechat-cloud-repository`.
  - Create group order through `/sub-pages/groupOrder/add/index`; result `saveMode: wechat-cloud-repository`, product count 1.
- Verified customer cloud flow:
  - Login as `customer` with `authSource: wechat-cloud`.
  - Open `/pages/customerOrders/edit/index?groupOrderId=<cloud id>`.
  - Create customer order; result `saveMode: wechat-cloud-repository`, status 0.
  - Declare paid; status became 1 and history count became 2.
  - After the customer scope fix, `listByGroupOrder` as customer returned only the customer's own order.
- Verified guide payment flow:
  - Login back as `guide`.
  - Confirm payment from customer orders page path; status became 2 and history count became 3.
- The targeted flow also verified string cloud document IDs across group order detail/order entry pages.

## QA Bug Report 202607021815
- Report location: `QA/QA_BUG_REPORT_202607021815.md`.
- Fixed BUG-001 through BUG-008 in code and docs.
- Added follow-up fixes for retest GUI residuals: home workbench, provider non-blank state, search starter hot words, data center layout/native wxss, chat disabled state, product add button style, and customer order role-scope text.
- BUG-009 remains: full 27-route GUI smoke test still needs to be re-executed before checking the final MVP gate.
- `QA_SEED_REQUIREMENTS.md` has been moved under `QA/QA_SEED_REQUIREMENTS.md`; project docs now reference the new path.

## Recommended Next Step
Read `CURRENT_TASKS.md` first for the session entry steps, then use `MVP_COMPLETION_CHECKLIST.md` as the canonical backlog for partially completed and missing work.

If continuing QA, use the new plan/result split:
- Plan: `QA/QA_DETAILED_RETEST_PLAN_20260702.md`.
- Results: `QA/QA_DETAILED_RETEST_RESULTS_20260702.md`.
- First unblock DevTools automation websocket/ticket/session or arrange manual/true-device workflow smoke; the latest run could not connect automation even though the IDE process was already open.
- Use real workflow smoke as the MVP GUI gate; keep direct 27-route route-open results as diagnostics.
- Validate tab state, layout, form input, toast/modal, eventChannel listener success, return navigation, reload/re-enter behavior, and the retest GUI fixes listed in `QA/QA_BUG_REPORT_202607021815.md`.
- For data center specifically, verify `pages/dataCenter/index.wxss` is applied: navbar says `数据中心`, page title says `团单数据看板`, cards are padded rather than flush-left, and the page title is not clipped under the fixed navbar.
- Keep documenting any GUI-only blockers in `ACCEPTANCE.md` and `MVP_COMPLETION_CHECKLIST.md`.

## User Assistance Needed For Phase 8
- Provide owner/admin OpenID allowlist values for formal role assignment, or approve keeping all new cloud users as guide/customer until admin tooling exists.
- If strict database console rules are required in addition to cloud-function permission checks, configure them manually in WeChat Cloud console or provide a CLI/API path.
- Provide a working DevTools automation ticket/session, or manually assist with the 27-route GUI smoke test if automation becomes unstable.

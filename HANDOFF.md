# HANDOFF

## Codex Entry Snapshot

- Canonical path: `/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- Current branch observed: `codex`
- Dirty status expected: dirty as of 2026-07-02; do not overwrite existing QA screenshots, bug report edits, or `pages/dataCenter` edits unless they are in scope.
- Start here: `HANDOFF.md`. This file is the only session entry point.
- Workflow rule: after reading this file, use `MVP_COMPLETION_CHECKLIST.md` only as the MVP gate / backlog reference. Use `QA/QA_BUG_REPORT_202607021815.md` only for current `不通過` problem rows. Never copy BUG row lists into the MVP checklist.
- QA/AGENT output rule: QA must not create extra plan/result/handoff/progress documents; QA reports only current not-pass rows in the BUG report. AGENT must not create extra docs; AGENT fixes product code, runs validation, and hands the fix back for QA verification.
- Environment rule: do not ask QA or the user to perform environment setup/cleanup as part of normal flow. The normal loop is fix, validate, QA retest in the BUG report.
- Reporting language rule: never write `GUI 證據不足`, `缺少 GUI 證據`, `待複測`, `未驗證`, `blocked`, `partial`, or equivalent proof-shortage wording. Test result language is only `通過` or `不通過`.
- Done definition: code fixed + validation run + valid verification for the runner. Codex App agents claiming UI/product behavior must operate the WeChat DevTools interface or a real device; CLI agents may use CLI/scripts/automation when that is the available runner. If still not pass, fix and test again.

## Current Source Of Truth
- Session entry point: `HANDOFF.md`.
- MVP gate reference: `MVP_COMPLETION_CHECKLIST.md`. It tracks MVP gate categories and product completion judgment, but QA/AGENT are not required to update it during normal fix/retest cycles.
- Current BUG list: `QA/QA_BUG_REPORT_202607021815.md`. Use it only for atomic current `不通過` problem rows. Do not create separate QA plan/result/handoff/progress files.
- Product rules: `PROJECT_RULES.md`.
- MVP roadmap, open items, and missing backlog: `MVP_COMPLETION_CHECKLIST.md`.
- Acceptance status: `ACCEPTANCE.md`.
- Data-layer recommendation: `DATA_LAYER_DECISION.md`.
- Data model and permissions: `DATA_MODEL_AND_PERMISSIONS.md`.
- QA route/data matrix: `QA/QA_SEED_REQUIREMENTS.md`.

## Current State
- Branch: `codex`.
- Product: WeChat mini program for China-based guides/tour leaders to manage group orders.
- Current runtime mode: mixed mode. Formal WeChat Cloud login and core business cloud persistence are connected; mock identities still use QA/local fallback.
- `config.js`: `isMock: false`, `baseUrl: ''`, `cloudEnvId: 'cloud1-3gwlqssy1f1972a9'`.
- Formal data layer direction: user confirmed WeChat Cloud Database + Cloud Functions, behind service/repository boundaries.
- Formal OpenID login: verified through deployed `authLogin`.
- Cloud `users` profile initialization: verified for current OpenID through DevTools automation.
- Phase 3 guide group-order persistence: cloud repository plus local/QA fallback is implemented.
- Product library: Phase 4 cloud repository plus local/QA fallback is implemented.
- Phase 5 customer ordering/payment workflow: cloud repository plus local/QA fallback is implemented.
- WeChat DevTools validation: targeted automation flow passed; full 28-route behavior verification is still not done.

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
- QA and development responsibilities must stay separate. QA reports current not-pass issues only in the BUG report; AGENT/development fixes product code and validates the fix. There is no separate QA environment lifecycle in the normal flow.
- QA must verify a named commit or clear handoff point before marking anything `通過`. Codex App QA must use the WeChat DevTools interface or a real device for UI/product behavior; CLI QA may use CLI/scripts/automation when that is the available runner. If the tested commit is missing, no row may be marked `通過`.
- Escalate to the user only for true-device help, credentials, deploy/production-data risk, destructive cleanup of unresolved project files, or product acceptance decisions.
- Before any context-compression handoff, do not create or update separate QA handoff files. Keep the current state in this `HANDOFF.md` only when explicitly asked; otherwise QA state belongs in the BUG report.
- BUG report status rule: only `通過` and `不通過` are allowed. If one row is too broad to verify in one pass, QA must split it into concrete fixable rows instead of creating any in-between status wording.
- Do not treat `不通過` rows as handoff completion. If the issue can be improved through code, data flow, UI, copy, route entry, or test automation, continue fixing instead of merely documenting it.
- For Codex App QA, a UI/product row can pass only after the relevant flow was actually clicked and operated in the WeChat DevTools interface or a real device. CLI agents are allowed to use CLI/scripts/automation, but static checks, route existence, screenshots alone, automation connection state, or written claims are not enough by themselves for user-facing behavior.
- This is not a development limit. Code fixes may batch related bugs when they share a module, data path, UI surface, or risk area; after fixing, run validation and hand back to QA so QA can map retest results back to each affected BUG row.
- If screenshots are used for visual review, target the WeChat DevTools window by window id, not the full desktop. The user has an external monitor and may be using another main screen; never capture unrelated desktop/private work.

## Validation Commands
```bash
git status --short --branch
npm run lint
git diff --check
```

## Known Not-Pass Items
- Full 28-route behavior verification.
- Product image upload through actual `wx.chooseMedia` picker after the cloud upload code path.
- Cloud database console security rules were not separately configured by CLI; permission checks are enforced in `businessData`, and pages do not directly access cloud DB.
- WeChat DevTools route verification.
- WeChat DevTools automation connect now works against `ws://127.0.0.1:9420` for targeted login verification; full route behavior verification is still not done.
- WeChat DevTools `auto-replay --replay-all` completed, but does not by itself replace complete route-by-route behavior verification.
- 28-route static file existence check passed.
- Product library flow: create -> list refresh -> status toggle -> soft delete.
- Phase 5 flow: customer entry -> select products -> submit order -> declare paid -> guide confirm/cancel.
- Guide full workflow: group order -> product selection -> reopen.
- Owner/admin allowlist values are not configured.
- Formal guide/customer OpenID isolation remains separate from QA/mock role isolation. The user approved using fake customer IDs for QA/mock isolation, but QA must not report that as formal OpenID verification.
- QA-only identity switch now exists in `AuthService.applyQaOverride()` and the `pages/my` QA Seed panel. It is limited to `config.isMock`, marks sessions with `qaOverride: true`, and must not be reported as formal WeChat OpenID permission evidence.
- The QA-only identity switch covers `guide`, `customer`, `owner`, `admin`, and `provider`. For this MVP gate, `guide` and `customer` are the required pass/fail roles; `owner`, `admin`, and `provider` are only for checking restricted/read-only/not-open/allowlist boundary states, not for declaring formal backend capability.
- DevTools automation should connect to an existing session first. If the session is unreachable or stuck, restart is allowed, but the final status still must be `通過` or `不通過`; do not write proof-shortage wording into the BUG report.
- "Real image" testing means selecting an image through `wx.chooseMedia`; seed image URLs or hard-coded HTTPS URLs are not enough to verify BUG-002.
- 2026-07-02 22:43 CST: Existing DevTools process was present. `miniprogram-automator.connect` returned 不通過 on `9420`, `19512`, and `3799`; CLI `auto --port 13521 --auto-port 9420` completed, but connects still returned 不通過 on `9420`, `13521`, and discovered WeChat/DevTools listening ports. The result stays `不通過`.
- 2026-07-02 23:11 CST: QA retried CLI `auto --project ... --auto-port 9420 --port 13521 --trust-project`; CLI completed, but websocket probes still returned 不通過 on `9420`, `52632`, `63842`, `40725`, `21511`, `29848`, `32123`, and `13521`.
- 2026-07-02 23:16 CST: Product library main page was visible in the WeChat DevTools window, but tab switching and deeper workflows were not completed, so affected rows remain `不通過`.
- 2026-07-02 23:39 CST: My page QA Seed role panel was visible and listed `owner/admin/guide/customer/provider`.
- QA-only role/openId switch implementation is present. Codex App QA must operate customer click-through and guide/customer order isolation through the WeChat DevTools interface or a real device before marking related rows `通過`; CLI QA may use CLI/scripts/automation if that is the available runner.

## 2026-07-03 MVP Backlog Development Pass
- `MVP_COMPLETION_CHECKLIST.md` 明确开发需求第一段 15 项已补齐并打勾：角色规则、角色申请审核、My/设置、商品新增编辑、开团、付款管理、导游资料、供应商资料、资料中心、消息、搜索、聊天入口处理、发布入口。
- Provider 已改为正式开放角色：`authLogin` / 用户审核 / roleScope / 商品权限 / 供应商资料 repository / `businessData` 均支持 provider 申请、审核、商品管理与供应商自资料维护；owner/admin 仍可管理全部。
- 商品库新增完整编辑链路：`products.update` cloud action、`ProductRepository.update/getById`、`ProductService.update/getById`、商品管理页编辑入口、商品表单按 id 回填并保存。
- 客户订单页新增付款状态筛选，并保留付款凭证、声明付款、确认收款、取消订单与详情处理。
- 消息中心改为从客户订单产生正式消息，支持已读状态与空状态；搜索页改为读取可见团单、商品与客户订单并可跳转结果。
- 导游资料页允许 guide 维护自己的导游/领队资料；供应商页允许 provider 维护自己的供应商资料。
- `ROLE_FEATURE_ACCESS_MATRIX.md` 已同步 provider/guide 正式开放后的入口与后端 guard。
- 本轮验证：`npm run lint`、`git diff --check` 均通过。
- 仍未勾：GUI/真机/DevTools 相关项、28-route smoke、图片/付款凭证真机选择、付款闭环 GUI 证据、全系统入口矩阵 GUI 验收、登录/待审核固定画面 GUI 证据、owner/admin allowlist 实际值验证、customer 分享下单规则实机验收。

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
- The report is not a broad project plan. It is the only QA reporting surface for BUG evidence, retest result, status, suspected area, and next action.
- BUG rows marked `通過` are closed; BUG/GUI rows marked `不通過` remain open. QA does not need to mirror rows into other files.
- Added follow-up fixes for retest GUI residuals: home workbench, provider non-blank state, search starter hot words, data center layout/native wxss, chat disabled state, product add button style, and customer order role-scope text.
- 2026-07-03 follow-up code fixes:
  - BUG-002: product add now separates formal cloud durable image copy from local/QA temporary preview copy, guards unsupported `wx.chooseMedia`, and prevents duplicate submit during image/product save.
  - BUG-004: home/settings/save-mode copy now branches by formal OpenID cloud save, QA override, and mock/local testing state.
  - BUG-006: customer order processing now uses a page-level action panel for payment method, payment remark, confirmed amount, confirmation remark, and cancel reason; local/cloud payment persistence keeps these fields.
  - BUG-006 follow-up: paid declaration action panel now supports payment proof image selection; service, local repository, and `businessData` reject empty paid declarations and non-positive guide confirmation amounts; formal cloud paths reject direct temporary product/proof image paths.
  - GUI-004 follow-up: `pages/dataCenter` now uses TDesign navbar `fixed` + `placeholder` instead of a hard-coded top offset, so the page title should sit below the custom navbar on varied device safe areas.
  - GUI-006 follow-up: `pages/my` QA Seed panel now has dedicated guide/customer order-isolation check buttons that switch QA role and open `/pages/customerOrders/index`.
  - BUG-009 workflow follow-up: home `开团` / `数据看板` now open non-tab pages through `navigateTo` instead of `switchTab`; profile/provider/tourGuide edit pages now implement the bound date click handler.
  - README follow-up: `README.md` now points to `HANDOFF.md` / `MVP_COMPLETION_CHECKLIST.md` and no longer states that the formal data layer or Phase 5 are missing.
- BUG-009 remains: full 28-route GUI smoke test still needs to be re-executed before checking the final MVP gate.
- `QA_SEED_REQUIREMENTS.md` has been moved under `QA/QA_SEED_REQUIREMENTS.md`; project docs now reference the new path.

## How To Continue
Start from this `HANDOFF.md` for project rules and current context. For concrete fix targets, use `QA/QA_BUG_REPORT_202607021815.md` rows marked `不通過`.

Do not create extra planning/result/handoff documents. If a missing defect is discovered, record it as a clear row in the BUG report; AGENT then fixes and validates, QA retests once more and updates that BUG row.

If continuing QA:
- Record the tested commit directly in `QA/QA_BUG_REPORT_202607021815.md`.
- Before marking any row `通過`, identify the tested commit. If QA cannot identify a tested commit, keep the row `不通過` and resolve the commit source first.
- First unblock DevTools automation websocket/ticket/session or arrange manual/true-device workflow smoke; the latest run could not connect automation even though the IDE process was already open.
- Use real workflow smoke as the MVP GUI gate; keep direct 28-route route-open results as diagnostics.
- When performing QA from a checklist item, validate tab state, layout, form input, toast/modal, eventChannel listener success, return navigation, reload/re-enter behavior, and the retest GUI fixes listed in `QA/QA_BUG_REPORT_202607021815.md`.
- For BUG-006, specifically retest the customer order bottom action panel: declare paid requires payment method, remark, or proof image; guide confirm requires a positive confirmed amount; order detail shows payment fields/proof count/history; and local/cloud repository history is preserved after reload.
- For BUG-004, compare formal OpenID and QA/mock sessions on home, setting, product library, group-order create/detail, and data center; do not mark it verified from static copy inspection alone.
- For data center specifically, verify `pages/dataCenter/index.wxss` is applied: navbar says `数据中心`, page title says `团单数据看板`, the TDesign navbar placeholder leaves visible top space, cards are padded rather than flush-left, and the page title is not clipped under the fixed navbar.
- For GUI-006, use My -> QA Seed -> `切换导游并查看订单` and `切换客户并查看订单`, then compare role text and visible orders on `/pages/customerOrders/index`.
- Document GUI-only blockers in the BUG report only unless the user explicitly asks for broader project-doc cleanup.

## User Assistance Needed For Phase 8
- Provide owner/admin OpenID allowlist values for formal role assignment, or approve keeping all new cloud users as guide/customer until admin tooling exists.
- If strict database console rules are required in addition to cloud-function permission checks, configure them manually in WeChat Cloud console or provide a CLI/API path.
- Provide a working DevTools automation ticket/session, or manually assist with the 28-route GUI smoke test if automation becomes unstable.

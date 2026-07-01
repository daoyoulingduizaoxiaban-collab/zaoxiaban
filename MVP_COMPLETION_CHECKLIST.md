# MVP_COMPLETION_CHECKLIST

## Purpose
This is the roadmap from the current QA/demo mini program to a real-user MVP. It is not the current task list.

For what to do next, read `CURRENT_TASKS.md`.

## Product Definition
- Product: WeChat mini program for China-based guides/tour leaders.
- Core workflow: group orders, group-order products, product library, customer orders, payment status.
- Required language: Simplified Chinese in product UI.
- Do not expand into marketplace, social feed, CRM, chat, or full admin backend unless explicitly requested.
- Any operation that is not formally persisted must clearly say local/QA/demo mode.

## Current Baseline
- QA/local mode is active.
- Formal data layer is not confirmed.
- Formal OpenID login is not verified.
- Product library has a local/QA repository implementation.
- Phase 5 customer ordering/payment workflow is not implemented.
- WeChat DevTools GUI smoke test has not been run.

## Completion Rules
- Only check an item when it is implemented and validated.
- Local/mock/QA implementation does not count as formal cloud persistence.
- Static checks do not count as GUI validation.
- A later phase being partly implemented does not imply earlier formalization gaps are complete.

## Phase 0 - Handoff Discipline
- [x] Project docs exist and define scope, rules, acceptance, tasks, and handoff.
- [x] Default validation commands are documented.
- [x] Forbidden actions are documented.
- [ ] Documentation is kept clean after every future task.

## Phase 0.5-0.7 - Blocking Defect Fixes
- [x] eventChannel opener/emit/navigation failure guards.
- [x] QR empty/invalid preview guard.
- [x] customer order id string/number comparison guard.
- [x] product library search/status path consistency.
- [x] message/chat socket null guard.
- [x] group order filter preserves `statusText`.
- [ ] eventChannel listener success verified in WeChat DevTools.

## Phase 1 - Data Layer Decision And Model
- [x] Data-layer recommendation documented.
- [x] Data model and permission draft documented.
- [x] `mock/qaSeed.ts` documented as QA/test data only.
- [ ] User confirms formal data-layer choice.
- [ ] Cloud/API repository implementation exists.
- [ ] Formal persistence is verified after app reopen/reload.

## Phase 2 - Auth And Roles
- [x] Auth adapter / mock fallback exists.
- [x] Local profile initialization exists.
- [x] MVP roles defined: `guide`, `customer`, `owner/admin`; `provider` is constrained.
- [x] Local role scope exists for guide/customer/admin visibility.
- [x] Starter login copy and irrelevant login options removed from main login page.
- [ ] Formal `wx.login` -> OpenID exchange verified.
- [ ] Cloud function `authLogin` exists.
- [ ] Cloud `users` profile initialization exists.
- [ ] Role scope verified in WeChat DevTools with real sessions.

## Phase 3 - Guide Group Order Workflow
- [ ] Guide sees only owned or authorized group orders from formal data source.
- [ ] Group order list supports loading, empty, error, search/filter no-result states.
- [ ] Formal group order create/edit exists.
- [ ] Formal group order detail exists.
- [ ] Formal group-order product list exists.
- [ ] Formal add/remove group-order products exists.
- [ ] Missing or unauthorized group order shows safe error/return state.
- [ ] Full guide flow persists after reopen/reload.

## Phase 4 - Product Library
- [x] Product list is role scoped in local/QA mode.
- [x] Product create uses product service/repository boundary.
- [x] Product has title, description, images, price rules, status, and source note.
- [x] Price rules compute numeric totals, not only display strings.
- [x] Status toggle uses product service/repository boundary.
- [x] Soft delete uses product service/repository boundary.
- [x] Search and status filter use the same service/repository path.
- [x] Required validation, loading/submitting, success, failure, and empty states exist.
- [ ] Formal cloud-backed product persistence exists.
- [ ] Product library GUI flow verified in WeChat DevTools.
- [ ] Product can be formally added to a group order and persist after reopen/reload.

## Phase 5 - Customer Ordering And Order Management
- [ ] Customer entry path is defined: share link, QR code, or route params.
- [ ] Customer can view group-order products and pricing.
- [ ] Customer can select products and quantities.
- [ ] Formal customer order creation exists.
- [ ] Guide sees customer orders for managed group orders.
- [ ] Customer sees only own orders.
- [ ] Payment statuses exist: unpaid, customer paid, confirmed, cancelled.
- [ ] Guide can confirm payment or cancel order.
- [ ] Payment status changes are traceable.
- [ ] Full customer order/payment flow persists after reopen/reload.

## Phase 6 - UI Cleanup
- [ ] Starter pages are removed or rewritten: home, message, dataCenter, release, search, login, setting.
- [ ] Visible navigation only exposes MVP-ready or clearly marked unfinished entries.
- [ ] Main-flow copy consistently uses group-order terminology.
- [ ] Forms have validation and submission states.
- [ ] Lists have loading, empty, error, normal, and no-result states.

## Phase 7 - GUI Smoke Test
- [ ] All routes in `app.json` opened in WeChat DevTools or device.
- [ ] Bottom tab state verified.
- [ ] Toast/modal/floating button/tab layout verified.
- [ ] Form input, back navigation, and re-entry verified.
- [ ] Results written to `ACCEPTANCE.md` and `HANDOFF.md`.

## Phase 8 - Real-User MVP Gate
All must be true before claiming real-user MVP:

- [ ] Formal data layer selected and implemented.
- [ ] Formal login/OpenID and basic permissions verified.
- [ ] Guide core workflow persists.
- [ ] Product library persists.
- [ ] Customer ordering and payment status workflow persists.
- [ ] 27-route GUI smoke test passes.
- [ ] `npm run lint` passes.
- [ ] `git diff --check` passes.
- [ ] No mock/local fallback is presented as production behavior.

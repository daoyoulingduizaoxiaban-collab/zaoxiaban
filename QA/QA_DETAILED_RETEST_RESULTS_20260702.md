# QA Detailed Retest Results - 2026-07-02

## Purpose

本文件是下一輪細測結果表，和既有 `QA/QA_BUG_REPORT_202607021815.md` 分開維護。測試完成後，再把最終結論同步回原 QA bug report、驗收文件與交接文件。

## Current Status

| Field | Value |
|---|---|
| Project | 導遊領隊早下班微信小程序 |
| Plan source | `QA/QA_DETAILED_RETEST_PLAN_20260702.md` |
| Original bug report | `QA/QA_BUG_REPORT_202607021815.md` |
| Status | In Progress - automation blocked; manual GUI screenshots captured for product library and QA Seed role panel |
| Test started at | 2026-07-02 22:43 CST |
| Test completed at | TBD |
| Evidence root | `QA/screenshots/2026-07-02-detailed-retest/` |
| DevTools policy | Connect existing session first; restart only if connection/session is actually blocked and record reason |
| Role policy | QA/mock identity can be used for QA role isolation, but must not be reported as formal OpenID verification |

## Execution Log

| Time | Action | Result | Evidence | Notes |
|---|---|---|---|---|
| 2026-07-02 22:43 CST | Pre-flight | Completed | `git status --short --branch` output | Branch `codex`, ahead 31; dirty files before this run: `CURRENT_TASKS.md`, `HANDOFF.md`, `QA/QA_DETAILED_RETEST_RESULTS_20260702.md` |
| 2026-07-02 22:43 CST | Read QA source | Completed | `QA/QA_BUG_REPORT_202607021815.md` | Confirmed next gap is real workflow smoke plus BUG-002/006/008/009 and GUI-004/006 retest |
| 2026-07-02 22:43 CST | Existing DevTools process check | Completed | process list | Existing WeChat DevTools process found; no restart, preview, deploy, or `automator.launch(...)` used |
| 2026-07-02 22:43 CST | Automation connect probe | Blocked | Ports `9420`, `19512`, `3799` | `miniprogram-automator.connect` failed on all known prior websocket ports |
| 2026-07-02 22:43 CST | CLI automation enable attempt | Partial | DevTools CLI `auto` | CLI reported IDE server actually on `13521`; `auto --port 13521 --auto-port 9420` completed, but no automator websocket became connectable |
| 2026-07-02 22:43 CST | Listening port probe | Blocked | Local ports `52366`, `54749`, `40725`, `21511`, `29848`, `32123`, `13521`, `14013`, `14016`, `14019`, `14022`, `14023` | All failed `miniprogram-automator.connect`; no new GUI screenshots or route interactions can be claimed |
| 2026-07-02 22:59 CST | Restarted same DevTools project once after stale automation session | Partial | N/A | User approved restart if truly needed. CLI `auto --port 13521 --auto-port 9420` reported success, but `miniprogram-automator.connect` still failed |
| 2026-07-02 23:00 CST | Computer Use fallback | Partial | Computer Use accessibility tree | Could read DevTools UI and observe product library, group-order tab, and guide customer-order tab; however DevTools exposes multiple stale webviews, so tab clicks and screenshot capture are not stable enough for final Pass |
| 2026-07-02 23:04 CST | Static validation | Pass | N/A | `npm run lint` passed; `git diff --check` passed |
| 2026-07-02 23:04 CST | QA role switch implementation check | Superseded | N/A | At that moment no implementation was present. This is superseded by commit `b7416ab`, which added `AuthService.applyQaOverride()` and the `pages/my` QA Seed panel |
| 2026-07-02 23:11 CST | Current code/dev-change check | Superseded | N/A | At that moment no new code dirty files were present. This is superseded by commit `b7416ab` |
| 2026-07-02 23:11 CST | Baseline validation rerun | Pass | N/A | `npm run lint` passed; `git diff --check` passed |
| 2026-07-02 23:11 CST | DevTools automation re-enable | Blocked | Ports `9420`, `52632`, `63842`, `40725`, `21511`, `29848`, `32123`, `13521` | CLI `auto --project ... --auto-port 9420 --port 13521 --trust-project` completed, but all websocket connect probes still failed |
| 2026-07-02 23:16 CST | Manual GUI evidence capture | Partial | `QA/screenshots/2026-07-02-detailed-retest/manual-gui-smoke/01_product_management.png` | Product library page is visible with title, cards, local/QA banner, tab bar, and add button. Tab switching via Computer Use/coordinates did not reliably change pages, so deeper flows remain blocked |
| 2026-07-02 23:30 CST | BUG fix - QA role switch | Static Pass / GUI Unverified | `services/auth/authService.js`, `pages/my/index.*` | Added `AuthService.applyQaOverride()` and QA Seed panel role buttons for `guide`, `customer`, `owner`, `admin`, `provider`; sessions are mock-only, `qaOverride: true`, and do not call formal wx.login/OpenID |
| 2026-07-02 23:38 CST | Automation websocket re-probe after latest fix | Blocked | Ports `9420`, `45087`, `56368`, `40725`, `21511`, `29848`, `32123`, `13521`, `14013`, `14016`, `14019`, `14022`, `14023` | Ports were listening, including `9420`, but `miniprogram-automator.connect` still failed with target project window not opened with automation enabled |
| 2026-07-02 23:39 CST | QA Seed role panel GUI check | Partial | `QA/screenshots/2026-07-02-detailed-retest/role-scope/01_my_qa_seed_role_panel.png` | My page rendered after refresh. QA Seed panel shows role options for product owner, admin, guide, customer, and provider. Attempting to click customer hit a stale product-library webview, so actual role switching and data isolation are not verified |
| 2026-07-02 23:48 CST | BUG-008 code fix | Static Pass / GUI Unverified | `sub-pages/groupOrder/productList/index.ts`, `index.wxml`, `index.less` | Replaced plain `wx.showModal` text detail with an in-page read-only detail panel including image, title, description, price rules, source note, and status; still needs DevTools/device click evidence |

## Core Flow Results

| ID | Flow | Planned Source | Result | Evidence Path | Suspected Area If Failed | Next Action |
|---|---|---|---|---|---|---|
| FLOW-001 | 導遊登入與首頁工作台 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Blocked | No new evidence | `pages/home/*`, `AuthService`, custom tab/nav state | Need working DevTools automation websocket or manual/device run |
| FLOW-002 | 商品新增 - 基本資料 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Partial | `QA/screenshots/2026-07-02-detailed-retest/manual-gui-smoke/01_product_management.png` | `sub-pages/product/add/*`, `ProductService`, `ProductRepository` | Product library and add button visible; add form entry/submission not yet verified |
| FLOW-003 | 商品圖片真實上傳 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Blocked | No new evidence | `uploadProductImages`, cloud storage fileID, product image rendering | Need DevTools/media picker or true device; seed/HTTPS URL is not enough |
| FLOW-004 | 團單建立 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Not Started | TBD | `sub-pages/groupOrder/add/*`, `GroupOrderService`, product snapshot mapping | TBD |
| FLOW-005 | 本團商品詳情點擊 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Partial | Static code fix: `sub-pages/groupOrder/productList/index.*` | `sub-pages/groupOrder/productList/*`, modal binding, product snapshot data | Detail panel now includes image/title/description/price/source/status; need GUI click evidence |
| FLOW-006 | 客戶入口與下單 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Not Started | TBD | `pages/customerOrders/edit/*`, route params, price calculation, customer order service | TBD |
| FLOW-007 | 手機驗證 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Not Started | TBD | `CustomerOrderService.validateCreatePayload`, form error display | TBD |
| FLOW-008 | 客戶聲明付款 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Blocked | No new evidence | `pages/customerOrders/index.js`, action modal, `updatePaymentStatus` | Need GUI modal interaction evidence |
| FLOW-009 | 導遊確認收款 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Blocked | No new evidence | `CustomerOrderRepository`, payment confirmation permission, amount parsing | Need guide GUI confirmation evidence |
| FLOW-010 | 付款歷史追溯 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Blocked | No new evidence | `paymentStatusHistory`, repository append order, UI rendering | Need GUI/history evidence after payment flow |
| FLOW-011 | guide/customer 資料隔離 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Partial | `QA/screenshots/2026-07-02-detailed-retest/role-scope/01_my_qa_seed_role_panel.png` plus static code check | `CustomerOrderRepository.listVisible`, auth profile role/meta, cloud permission checks | QA-only role switch panel is visible and role set is correct; actual customer switch click and guide/customer order isolation still need stable DevTools/device validation; formal OpenID isolation remains separate |
| FLOW-012 | 資料中心入口與標題裁切 | `QA_DETAILED_RETEST_PLAN_20260702.md` | Blocked | No new evidence | `pages/dataCenter/*`, custom navbar safe area, top padding | Need fresh screenshot after latest wxss/top-padding fix |

## Page GUI Results

| ID | Route | Entry Method | Result | Evidence Path | Suspected Area If Failed | Next Action |
|---|---|---|---|---|---|---|
| PAGE-001 | `pages/home/index` | Real entry / post-login | Not Started | TBD | home layout, auth/session banner | TBD |
| PAGE-002 | `pages/groupOrder/index` | `switchTab` | Partial | Computer Use accessibility tree observed group-order list | custom tab, group order repository | Group list visible through accessibility tree; saved screenshot capture/control unstable, so not final Pass |
| PAGE-003 | `sub-pages/groupOrder/add/index` | From group order list/home | Not Started | TBD | form validation, product picker integration | TBD |
| PAGE-004 | `sub-pages/groupOrder/detail/index` | From group order card with id | Not Started | TBD | route id parsing, detail data loader | TBD |
| PAGE-005 | `sub-pages/groupOrder/productList/index` | From group order detail | Not Started | TBD | click handler, modal state | TBD |
| PAGE-006 | `sub-pages/groupOrder/product-picker/index` | From product-select workflow | Not Started | TBD | eventChannel listener, selected product payload | TBD |
| PAGE-007 | `pages/productManagement/index` | Existing DevTools page / tab page | Partial | `QA/screenshots/2026-07-02-detailed-retest/manual-gui-smoke/01_product_management.png` | product repository, tab state | Product library visible with local/QA banner, product cards, and add button; add/edit/delete/status actions not exercised |
| PAGE-008 | `sub-pages/product/add/index` | From product library | Not Started | TBD | product form, upload, CTA style | TBD |
| PAGE-009 | `sub-pages/product/list/index` | Workflow or diagnostic | Not Started | TBD | list data loader, read-only mode | TBD |
| PAGE-010 | `pages/customerOrders/index` | `switchTab` as guide/customer | Partial | Computer Use accessibility tree observed guide customer-order list | role scope, customer order repository | Guide text `当前身份：导游/领队` and orders visible; customer role switch is now available from QA panel, but click-through/data isolation is still not verified because stale webview clicks returned to product library |
| PAGE-011 | `pages/customerOrders/edit/index` | `groupOrderId` / share path | Not Started | TBD | route params, price calculation | TBD |
| PAGE-012 | `pages/dataCenter/index` | Home/workbench entry | Not Started | TBD | fixed navbar spacing, wxss application | TBD |
| PAGE-013 | `pages/search/index` | Search entry or diagnostic | Not Started | TBD | search page copy/data | TBD |
| PAGE-014 | `pages/providers/index` | My/related entry or diagnostic | Not Started | TBD | provider role gate, empty state | TBD |
| PAGE-015 | `pages/providers/edit/index` | Diagnostic unless workflow exists | Not Started | TBD | edit form placeholder handling | TBD |
| PAGE-016 | `pages/tourGuides/index` | Diagnostic / profile workflow | Not Started | TBD | guide seed/profile data | TBD |
| PAGE-017 | `pages/tourGuides/edit/index` | Diagnostic | Not Started | TBD | edit form placeholder handling | TBD |
| PAGE-018 | `pages/profile/index` | Profile entry | Not Started | TBD | profile data binding | TBD |
| PAGE-019 | `pages/profile/edit/index` | Profile edit entry | Not Started | TBD | profile form state | TBD |
| PAGE-020 | `pages/message/index` | Real entry / diagnostic | Not Started | TBD | message/chat disabled state | TBD |
| PAGE-021 | `pages/chat/index` | Diagnostic unless linked | Not Started | TBD | chat disabled state | TBD |
| PAGE-022 | `pages/my/index` | `switchTab` | Partial | `QA/screenshots/2026-07-02-detailed-retest/role-scope/01_my_qa_seed_role_panel.png` | my page role/session rendering | My page and QA Seed role panel render. Actual role button switch still needs stable click evidence |
| PAGE-023 | `pages/my/info-edit/index` | My page entry | Not Started | TBD | info edit form | TBD |
| PAGE-024 | `pages/login/login` | Logout / diagnostic | Not Started | TBD | role options, auth service | TBD |
| PAGE-025 | `pages/loginCode/loginCode` | Login workflow / diagnostic | Not Started | TBD | login code form | TBD |
| PAGE-026 | `pages/setting/index` | My/settings entry | Not Started | TBD | save mode text, auth session meta | TBD |
| PAGE-027 | `pages/release/index` | Diagnostic / group entry if linked | Not Started | TBD | release page copy/entry wiring | TBD |

## Bug Retest Results

| Bug ID | Previous Status | Result | Evidence Path | Suspected Area | Next Action |
|---|---|---|---|---|---|
| BUG-001 | Fixed - Verified | Not Started | TBD | WeChat share API / group-order detail share path / real device share card | TBD |
| BUG-002 | Partially Fixed | Blocked | No new evidence | `sub-pages/product/add/index.ts`, `uploadProductImages`, cloud storage fileID persistence | Need actual `wx.chooseMedia` / true device evidence |
| BUG-003 | Fixed - Verified | Not Started | TBD | `sub-pages/groupOrder/add`, `GroupOrderService`, customer entry rendering | TBD |
| BUG-004 | Partially Fixed | Not Started | TBD | `getSaveModeText`, `AuthService` session meta, page copy | TBD |
| BUG-005 | Fixed - Verified | Not Started | TBD | `services/auth/roleScope.js`, login role selector, cloud allowlist env | TBD |
| BUG-006 | Partially Fixed | Blocked | No new evidence | `pages/customerOrders/index.js`, `CustomerOrderService.updatePaymentStatus`, `paymentHistory` persistence | Need full GUI payment modal/confirmation/history run |
| BUG-007 | Fixed - Verified | Not Started | TBD | `CustomerOrderService.validateCreatePayload`, customer order edit validation | TBD |
| BUG-008 | Blocked / Unverified | Partial | Static code fix: `sub-pages/groupOrder/productList/index.*` | `sub-pages/groupOrder/productList/index.ts/wxml/less`, click handler, detail panel binding | Code now opens an in-page read-only product detail panel with image and price rules; need GUI click screenshot |
| BUG-009 | Partially Fixed | Blocked | websocket probe notes plus `QA/screenshots/2026-07-02-detailed-retest/role-scope/01_my_qa_seed_role_panel.png` | QA automation strategy, route guard fallbacks, real workflow entry design | `9420` is listening but automator still cannot connect; manual GUI evidence is partial only. Need working DevTools automation websocket or stable manual/device workflow smoke |

## Final Summary

| Question | Answer |
|---|---|
| 哪些已確認修好 | Static checks pass. 商品庫主頁 GUI 有有效截圖；「我的」頁 QA Seed 身份切換面板可見，且角色集合包含 owner/admin/guide/customer/provider |
| 哪些仍未修 | BUG-009 automation/workflow smoke 仍 blocked；QA role switch click-through、guide/customer 訂單隔離、BUG-002/006、GUI-004/006 仍待穩定 GUI/真機複測；BUG-008 已補程式但仍需 GUI 點擊截圖 |
| 哪些需要真機或正式微信 OpenID | 真圖片 `wx.chooseMedia`、正式 guide/customer OpenID 隔離、完整付款閉環 GUI、資料中心最新布局截圖；mock 隔離可先用「我的」页 QA Seed 面板切角色，但目前點擊受 stale webview 影響 |
| 是否可以宣告真人可用 MVP gate 通過 | 不可以。目前只有商品庫主頁與 My/QA Seed 面板有效 GUI 截圖；未取得完整 DevTools/device workflow evidence，Phase 7/8 gate 仍未通過 |

# QA Detailed Retest Plan - 2026-07-02

## Purpose

本文件是下一輪 QA 細測計劃，只由本輪 QA agent 維護。使用者確認前，本文件只作計劃，不代表已開始測試，也不代表任何項目已通過。

## Current Baseline

| Item | Current Value |
|---|---|
| Project | 導遊領隊早下班微信小程序 |
| Canonical path | `/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan` |
| Branch at planning time | `codex` |
| Git state at planning time | Clean working tree; branch ahead of origin |
| Main QA source | `QA/QA_BUG_REPORT_202607021815.md` |
| MVP gate source | `MVP_COMPLETION_CHECKLIST.md`, `ACCEPTANCE.md` |
| Test policy | Use real workflow smoke as MVP GUI gate; keep direct 27-route smoke as diagnostic only |
| Plan status | In Progress - execution started; statuses below reflect latest QA attempt |
| Commit status | Not committed |

## Status Legend

| Status | Meaning |
|---|---|
| Planned | 已列入計劃，尚未開始 |
| In Progress | 正在測試或補證據 |
| Pass | 已用指定方式驗證通過，且有證據 |
| Failed | 已驗出問題或不符合預期 |
| Partial | 部分通過，但仍有缺口 |
| Blocked | 因真機、正式 OpenID、DevTools session、圖片選擇、權限或資料不足暫不能判定 |
| Not Applicable | 此頁/情境不適用於本輪 MVP gate |

## Retest Strategy

## Focused Execution Rules

| Rule | Required Behavior | Reason |
|---|---|---|
| Evidence per row | For GUI/QA evidence, tie each focused test and screenshot set to a specific FLOW/PAGE/BUG row, then update that row before claiming it passed | Avoid broad retests where evidence, status, and failure cause cannot be traced |
| Development batching allowed | Code fixes may batch related bugs when they touch the same module, data path, UI surface, or risk area; after fixing, map the validation result back to each affected row | This rule is for QA evidence traceability, not a limit that only one bug may be fixed at a time |
| Announce the target | Record or state the exact FLOW/PAGE/BUG ID before testing evidence for that row | Keeps evidence and status tied to the right item |
| Window-only screenshots | Capture the WeChat DevTools window by window id, not the whole screen | User may have external monitors or another active main screen |
| Privacy guard | Discard and redo any screenshot that includes unrelated desktop/main-screen content | QA evidence must not expose unrelated user work |
| Evidence verification | Open or inspect each screenshot before marking evidence usable | Prevents saving stale, blank, or wrong-window screenshots |

| Order | Stage | Goal | Method | Output | Status |
|---:|---|---|---|---|---|
| 1 | Pre-flight | 確認測試前狀態乾淨，避免混到其他 agent 變更 | `git status --short --branch`、讀 QA report、確認 DevTools 連線方式 | 記錄 baseline 與任何 dirty 檔案 | Pass |
| 2 | Real workflow smoke | 先確認真人會用到的入口能到達，不再用 direct route timeout 當唯一 gate | 由首頁、tab、列表、詳情、客戶入口、設定等真實入口進入 | Smoke 結果表、截圖資料夾 | Blocked |
| 3 | Core flow deep test | 細測商品、團單、客戶下單、付款閉環、圖片上傳 | 逐步操作表單、提交、重開、確認狀態與歷史 | Flow evidence、bug report 更新 | Partial |
| 4 | Role and permission test | 驗 guide/customer 的資料隔離與文案 | 分別以 guide/customer 身份登入或模擬正式 OpenID session | role evidence、未驗證項清單 | Partial |
| 5 | Page-by-page GUI test | 依 `app.json` route 覆蓋主要頁面 UI、空狀態、錯誤/未完成提示 | 真實入口優先；必要時 direct open 僅作診斷 | route/page matrix 更新 | Partial |
| 6 | Documentation update | 把結果正式寫回 QA 文件與驗收文件 | 更新 QA report、ACCEPTANCE、MVP checklist、HANDOFF/CURRENT_TASKS | 待提交文件清單 | In Progress |
| 7 | Final gate decision | 判斷真人可用 MVP gate 是否可宣告通過 | 彙總 Pass/Failed/Blocked/Unverified | 最終 QA 結論 | Blocked |

## Core Flow Test Matrix

| ID | Priority | Flow | Preconditions | Steps To Execute Later | Expected Result | Evidence To Capture | Suspected Area If Failed | Status |
|---|---:|---|---|---|---|---|---|---|
| FLOW-001 | P0 | 導遊登入與首頁工作台 | DevTools 可連接既有小程序 session；不重啟/不 refocus | 進入登入/首頁，確認 guide 身份、工作台入口、資料模式提示 | 首頁可用、入口清楚、無 starter/Phase 文案 | 首頁截圖、session meta 摘要 | `pages/home/*`, `AuthService`, custom tab/nav state | Blocked |
| FLOW-002 | P0 | 商品新增 - 基本資料 | guide 身份；商品庫可進入 | 從商品庫進新增商品，填名稱、描述、價格、狀態、來源備註後保存 | 商品保存成功，列表可見，重新進入仍存在 | 新增頁、成功 toast、商品列表截圖 | `sub-pages/product/add/*`, `ProductService`, `ProductRepository` | Partial |
| FLOW-003 | P0 | 商品圖片真實上傳 | DevTools/真機允許 `chooseMedia` 或可取得替代真實媒體路徑 | 新增商品時選真圖片，保存後重開商品列表/詳情 | 圖片不是短期 temp path；重開仍顯示 | 選圖前後、重開後截圖，保存資料摘要 | `uploadProductImages`, cloud storage fileID, product image rendering | Blocked |
| FLOW-004 | P0 | 團單建立 | guide 身份；至少一個可用商品 | 建立團單，填時間、截止、取貨、付款說明、聯絡人、客戶提示，加入商品 | 團單建立成功，資料完整，商品 snapshot 保留 | 團單新增、詳情、商品區截圖 | `sub-pages/groupOrder/add/*`, `GroupOrderService`, product snapshot mapping | Planned |
| FLOW-005 | P0 | 本團商品詳情點擊 | 已有包含商品的團單 | 從團單詳情進本團商品列表，點任一商品 | 開啟只讀商品詳情，不出現「未完成」toast | 點擊前、詳情 modal 截圖 | `sub-pages/groupOrder/productList/*`, modal binding, product snapshot data | Blocked |
| FLOW-006 | P0 | 客戶入口與下單 | 已有開放收單團單與 sharePath/groupOrderId | 從團單詳情複製/進入客戶下單入口，填姓名、手機、商品數量並提交 | 客戶可看到團單資訊與商品，提交後產生訂單 | 客戶入口、表單、提交成功、訂單資料截圖 | `pages/customerOrders/edit/*`, route params, price calculation, customer order service | Planned |
| FLOW-007 | P1 | 手機驗證 | 客戶下單頁可進入 | 先輸入非法手機，再輸入合法 11 位中國大陸手機 | 非法手機阻止提交；合法手機可提交 | 錯誤提示、成功提交截圖 | `CustomerOrderService.validateCreatePayload`, form error display | Planned |
| FLOW-008 | P0 | 客戶聲明付款 | 已有未付款客戶訂單；customer 身份 | 客戶進訂單列表/詳情，填付款方式、備註、憑證或憑證替代資料後聲明付款 | 訂單狀態變為客戶已付款，付款資料保存 | modal、狀態變更、付款資料截圖 | `pages/customerOrders/index.js`, action modal, `updatePaymentStatus` | Blocked |
| FLOW-009 | P0 | 導遊確認收款 | 已有客戶已付款訂單；guide 身份 | 導遊查看客戶訂單，填實收金額與確認備註，確認收款 | 狀態變已確認，實收金額/備註保存 | 確認 modal、列表/詳情狀態截圖 | `CustomerOrderRepository`, payment confirmation permission, amount parsing | Blocked |
| FLOW-010 | P0 | 付款歷史追溯 | 已跑完下單、聲明付款、確認收款 | 查看訂單詳情或列表中的付款歷史 | 至少有建立、聲明付款、確認收款三段歷史 | 歷史紀錄截圖或資料摘要 | `paymentStatusHistory`, repository append order, UI rendering | Blocked |
| FLOW-011 | P0 | guide/customer 資料隔離 | 可切換 guide/customer；正式 OpenID 最佳 | guide 看自己團單下訂單；customer 只看自己的訂單 | guide/customer 文案正確，customer 不看到其他客戶或其他團單資料 | guide/customer 訂單列表截圖 | `CustomerOrderRepository.listVisible`, auth profile role/meta, cloud permission checks, DevTools stale webview click target | Partial |
| FLOW-012 | P1 | 資料中心入口與標題裁切 | guide 身份；有團單/商品/訂單資料 | 從首頁或工作流入口進資料中心，觀察 nav/title/cards | `数据中心` navbar 與 `团单数据看板` 不重疊、不裁切，卡片正常 | 資料中心截圖 | `pages/dataCenter/*`, custom navbar safe area, top padding | Blocked |

## Page-by-Page GUI Matrix

| ID | Route | Entry Method | What To Verify Later | Expected Result | Evidence | Suspected Area If Failed | Status |
|---|---|---|---|---|---|---|---|
| PAGE-001 | `pages/home/index` | Real entry / post-login | 工作台摘要、主要入口、資料模式提示 | 可作為真人起始頁 | Screenshot | home layout, auth/session banner | Blocked |
| PAGE-002 | `pages/groupOrder/index` | `switchTab` | 團單列表、搜尋/篩選、空狀態、進詳情 | tab 狀態正確，資料可點 | Screenshot + interaction notes | custom tab, group order repository | Partial |
| PAGE-003 | `sub-pages/groupOrder/add/index` | 從團單列表/首頁開團入口 | 表單、校驗、商品選擇入口、保存 | 能建立/編輯團單 | Screenshots | form validation, product picker integration | Planned |
| PAGE-004 | `sub-pages/groupOrder/detail/index` | 從團單列表點卡片，帶 required id | 團單資訊、QR/客戶入口、客戶訂單、本團商品入口 | 詳情完整，不缺 id 時不報錯 | Screenshot | route id parsing, detail data loader | Planned |
| PAGE-005 | `sub-pages/groupOrder/productList/index` | 從團單詳情進入 | 本團商品、加入/移除、只讀詳情 modal | 不再出現未完成 toast | Screenshot | click handler, modal state | Blocked |
| PAGE-006 | `sub-pages/groupOrder/product-picker/index` | 從開團/本團商品 workflow 開啟 | 商品選擇、搜尋、未選提示、返回 | eventChannel/回傳正常 | Screenshot + notes | eventChannel listener, selected product payload | Planned |
| PAGE-007 | `pages/productManagement/index` | `switchTab` | 商品列表、搜尋/篩選、新增、上下架/刪除入口 | 商品庫可管理 | Screenshot | product repository, tab state | Partial |
| PAGE-008 | `sub-pages/product/add/index` | 從商品庫新增 | 表單一致性、藍色 CTA、圖片、價格規則、提交狀態 | 表單可用且樣式一致 | Screenshot | product form, upload, CTA style | Planned |
| PAGE-009 | `sub-pages/product/list/index` | 從需要選商品的 workflow 或 direct diagnostic | 商品列表只讀/選擇狀態 | 顯示合理，不白屏 | Screenshot | list data loader, read-only mode | Planned |
| PAGE-010 | `pages/customerOrders/index` | `switchTab` as guide/customer | 訂單列表、角色文案、付款/確認/取消操作 | guide/customer 權限與文案正確 | Screenshots for both roles | role scope, customer order repository, stale webview after role click | Partial |
| PAGE-011 | `pages/customerOrders/edit/index` | 透過 `groupOrderId` 或 share path | 客戶下單、商品數量、手機驗證、提交 | 客戶可完成下單 | Screenshot + order id | route params, price calculation | Planned |
| PAGE-012 | `pages/dataCenter/index` | 從首頁/工作台入口 | navbar、標題、summary cards、fallback/正式文案 | 不裁切、不破版 | Screenshot | fixed navbar spacing, wxss application | Blocked |
| PAGE-013 | `pages/search/index` | 從搜尋入口或 direct diagnostic | 搜尋詞、空狀態、取消返回 | 無 AI/模板熱詞 | Screenshot | search page copy/data | Planned |
| PAGE-014 | `pages/providers/index` | 從我的/相關入口或 direct diagnostic | 供應商只讀資料、未開放提示 | 不白屏 | Screenshot | provider role gate, empty state | Planned |
| PAGE-015 | `pages/providers/edit/index` | direct diagnostic unless real workflow exists | 未完成/保存提示，不崩潰 | 明確提示未開放或暫未保存 | Screenshot | edit form placeholder handling | Planned |
| PAGE-016 | `pages/tourGuides/index` | direct diagnostic / profile workflow | 導遊資料、空狀態、未完成提示 | 不白屏、不 starter | Screenshot | guide seed/profile data | Planned |
| PAGE-017 | `pages/tourGuides/edit/index` | direct diagnostic | 編輯表單、未保存提示 | 不崩潰，有清楚提示 | Screenshot | edit form placeholder handling | Planned |
| PAGE-018 | `pages/profile/index` | 我的頁入口 | 個人資料展示、編輯入口 | 顯示目前身份資料 | Screenshot | profile data binding | Planned |
| PAGE-019 | `pages/profile/edit/index` | profile edit entry | 編輯表單、保存提示 | 不崩潰，有清楚提示 | Screenshot | profile form state | Planned |
| PAGE-020 | `pages/message/index` | real entry / direct diagnostic | 聊天未啟用狀態、跳轉客戶訂單 | 不出現可輸入聊天框 | Screenshot | message/chat disabled state | Planned |
| PAGE-021 | `pages/chat/index` | direct diagnostic unless linked | 聊天能力暫未啟用 | 不可輸入假聊天 | Screenshot | chat disabled state | Planned |
| PAGE-022 | `pages/my/index` | `switchTab` | 角色、seed/資料模式、設定入口 | 無混亂 starter 文案 | `QA/screenshots/2026-07-02-detailed-retest/role-scope/01_my_qa_seed_role_panel.png` | my page role/session rendering, role button click target | Partial |
| PAGE-023 | `pages/my/info-edit/index` | 我的頁入口 | 個資編輯頁、保存提示 | 不崩潰，有明確狀態 | Screenshot | info edit form | Planned |
| PAGE-024 | `pages/login/login` | logout/direct diagnostic | guide/customer 登入入口、owner/admin 不暴露 | 角色選項符合 MVP | Screenshot | role options, auth service | Planned |
| PAGE-025 | `pages/loginCode/loginCode` | login workflow/direct diagnostic | 驗證碼表單與提示 | 不崩潰，有校驗提示 | Screenshot | login code form | Planned |
| PAGE-026 | `pages/setting/index` | 我的頁/設定入口 | 角色、資料模式、正式/QA 提示、未完成後台提示 | 文案不誤導正式狀態 | Screenshot | save mode text, auth session meta | Planned |
| PAGE-027 | `pages/release/index` | direct diagnostic / open group entry if linked | 開團入口、社交發布停用提示 | 不誤導成可用社交 feed | Screenshot | release page copy/entry wiring | Planned |

## Bug Retest Mapping

| Bug ID | Current Status In QA Report | Retest Needed In This Plan | Planned Check | Evidence Target | Status |
|---|---|---|---|---|---|
| BUG-001 | Fixed - Verified | Light regression only | 確認團單詳情仍有客戶入口/sharePath | Group detail screenshot | Planned |
| BUG-002 | Partially Fixed | Yes | 真圖片上傳，重開後仍顯示 | Product image before/after/reopen screenshots | Blocked |
| BUG-003 | Fixed - Verified | Light regression only | 團單欄位在詳情與客戶入口顯示 | Group create/detail/customer entry screenshots | Planned |
| BUG-004 | Partially Fixed | Yes | 正式 OpenID / mock fallback 文案分流 | Home/setting/product/dataCenter screenshots | Planned |
| BUG-005 | Fixed - Verified | Light regression only | 登入頁只暴露 guide/customer | Login screenshot | Planned |
| BUG-006 | Partially Fixed | Yes | 客戶聲明付款、導遊確認、實收、備註、歷史 | Payment flow screenshots | Blocked |
| BUG-007 | Fixed - Verified | Light regression only | 非法/合法手機提交行為 | Validation screenshots | Planned |
| BUG-008 | Blocked / Unverified | Yes | 點本團商品詳情，不再未完成 toast | Product detail modal screenshot | Blocked |
| BUG-009 | Partially Fixed | Yes | real workflow smoke 取代 direct 27-route 作 MVP gate | Smoke matrix and screenshots | Blocked |

## GUI Residual Retest Mapping

| GUI ID | Current Status In QA Report | Planned Retest | Evidence Target | Suspected Area If Still Failed | Status |
|---|---|---|---|---|---|
| GUI-001 | Fixed - Verified | 首頁工作台回歸檢查 | Home screenshot | `pages/home/*` | Blocked |
| GUI-002 | Fixed - Verified | 供應商頁非白屏回歸檢查 | Provider screenshot | `pages/providers/*` | Planned |
| GUI-003 | Fixed - Verified | 搜尋頁業務詞與空狀態檢查 | Search screenshot | `pages/search/*` | Planned |
| GUI-004 | Fixed - Needs GUI Retest | 必測，確認資料中心不裁切 | Data center screenshot | `pages/dataCenter/*`, custom navbar top padding | Blocked |
| GUI-005 | Fixed - Verified | 商品新增 CTA 樣式回歸檢查 | Product add screenshot | `sub-pages/product/add/*` | Blocked |
| GUI-006 | Partially Fixed | 必測 guide/customer 身份文案與隔離 | Customer orders screenshots for both roles | `pages/customerOrders/*`, role scope repository | Partial |

## Evidence Plan

| Evidence Type | Planned Project Path | Naming Rule | Used For | Status |
|---|---|---|---|---|
| Smoke screenshots | `QA/screenshots/2026-07-02-detailed-retest/real-workflow-smoke/` | `NN_route_or_flow_name.png` | Stage 2 real workflow smoke | Blocked |
| Core flow screenshots | `QA/screenshots/2026-07-02-detailed-retest/core-flows/` | `FLOW-XXX_step_name.png` | 商品、團單、客戶下單、付款、圖片 | Blocked |
| Role screenshots | `QA/screenshots/2026-07-02-detailed-retest/role-scope/` | `ROLE_guide_or_customer_page.png` | guide/customer 隔離；current evidence includes `01_my_qa_seed_role_panel.png` | Partial |
| Diagnostic route results | `QA/screenshots/2026-07-02-detailed-retest/diagnostic-route-smoke/` | `route-smoke-results.json` plus screenshots if produced | 保留 direct route timeout 診斷 | Blocked |
| Manual GUI fallback screenshots | `QA/screenshots/2026-07-02-detailed-retest/manual-gui-smoke/` | `NN_page_name.png` | automation blocked 時保存可確認的人工觀察證據 | Partial |
| Contact sheet | `QA/screenshots/2026-07-02-detailed-retest/contact_sheet.jpg` | One contact sheet per major run | 快速審閱 GUI 結果 | Planned |

Screenshot capture rule: every GUI evidence screenshot must be captured from the WeChat DevTools window only, after confirming the current window id. Do not use full-screen capture on a multi-monitor setup.

## Documentation Update Plan

| File | Update Timing | Planned Update | Status |
|---|---|---|---|
| `QA/QA_BUG_REPORT_202607021815.md` | 每輪細測完成後 | 更新 Status、Retest Result、Evidence path、Next Action、Suspected Area | Planned |
| `ACCEPTANCE.md` | 細測完成後 | 記錄 real workflow smoke、未驗證項、MVP gate 結論 | In Progress |
| `MVP_COMPLETION_CHECKLIST.md` | gate 判定後 | 更新 Phase 7 / Phase 8 GUI gate 狀態 | In Progress |
| `CURRENT_TASKS.md` | 本輪測試收尾 | 把下一位 agent 該做的唯一任務改成最新狀態 | In Progress |
| `HANDOFF.md` | 本輪測試收尾 | 寫入證據路徑、阻塞、下一步 | In Progress |

## Stop / Escalation Rules

| Condition | Action | Status |
|---|---|---|
| WeChat DevTools automation cannot connect to existing session | Stop and report blocker; do not launch/restart/refocus without user approval | Triggered |
| True image picker cannot be operated in DevTools | Mark image upload as Blocked or request manual assistance/true device check | Blocked |
| Formal OpenID cannot be switched between guide/customer | Mark formal role isolation as Blocked; separate mock/local result from formal result | Blocked for formal OpenID; QA/mock switch panel visible; actual role click still affected by stale webview |
| A P0 flow breaks before later flows can continue | Stop deep run, record failed evidence, update QA report before continuing optional pages | Planned |
| Production/cloud data deletion would be required | Do not proceed; ask user explicitly | Planned |
| Unrelated dirty files appear | Do not touch; report exact paths before editing QA docs | Planned |

## MVP Gate Criteria For This Retest

| Criterion | Required For MVP Gate | Planned Validation | Status |
|---|---|---|---|
| Guide can create product and group order | Yes | FLOW-002, FLOW-004 | Partial |
| Customer can enter via group order share path and submit order | Yes | FLOW-006 | Planned |
| Customer can declare payment | Yes | FLOW-008 | Blocked |
| Guide can confirm payment with actual amount/remark | Yes | FLOW-009 | Blocked |
| Payment history is visible/persistent | Yes | FLOW-010 | Blocked |
| Product image survives reopen after real upload | Yes, unless explicitly marked device-blocked | FLOW-003 | Blocked |
| guide/customer data isolation is correct | Yes | FLOW-011 | Partial - QA panel visible, isolation click-through not verified |
| Major GUI pages are reachable through real workflow | Yes | Stage 2 + Page matrix | Blocked |
| Direct 27-route smoke passes | No; diagnostic only under current policy | Diagnostic route run if needed | Blocked |
| Unfinished areas are clearly labeled | Yes | Page matrix | Partial |

## Initial Risk Register

| Risk | Impact | Mitigation | Status |
|---|---|---|---|
| Direct route smoke keeps timing out on pages requiring params/eventChannel/tab entry | Could falsely fail MVP gate | Use real workflow entry as gate, keep direct route as diagnostic | Active |
| DevTools cannot simulate true media picker reliably | BUG-002 may remain unverified | Try DevTools path first; if blocked, mark needs true device | Active |
| Formal OpenID role switching is limited | guide/customer isolation may not be fully provable | Separate formal OpenID evidence from mock/local role evidence | Active |
| Cloud data state from prior runs may affect screenshots | Results may be hard to reproduce | Record created ids/order ids and session role in evidence notes | Planned |
| Existing docs still mention 27-route as hard gate | Conflicting acceptance language | Update docs after user approves plan and retest results are known | Planned |

## Approval Note

本文件原本是計劃草案；使用者已確認後開始執行。後續狀態應持續同步到本表與 `QA/QA_DETAILED_RETEST_RESULTS_20260702.md`，不可讓已執行項目長期停在 `Planned`。

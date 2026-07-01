# MVP_COMPLETION_CHECKLIST

## 目的
這份清單是把目前 QA 展示型小程序推進到「真人可用 MVP」的總清單與驗收邊界。

CLI agent 每次開工都必須先讀本文件，再讀 `PROJECT_RULES.md`、`CURRENT_TASKS.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`QA_SEED_REQUIREMENTS.md`。不要只看聊天摘要，不要憑印象補需求。

每一輪實際要做什麼，以 `CURRENT_TASKS.md` 的當前任務為準。本文件只定義整體方向、驗收標準、禁止事項和不能漏掉的工作；不要因為本文件很完整，就一次展開登入、資料庫、GUI、UI、訂單等多個大範圍任務。

## 不可做歪的產品定義
- 產品是面向中國境內導遊/領隊使用的微信小程序，不是 TDesign starter 展示站。
- 核心業務是「導遊/領隊開團管理」。
- 核心名詞固定使用簡體中文：「开团」、「团单」、「本团商品」、「商品库」、「客户订单」、「收款状态」。
- 第一個真人可用版本只做導遊/領隊工作流，不要擴張成完整商城、社群、內容發布、CRM 或聊天產品。
- 客戶側、供應商側、系統管理員側只在導遊 MVP 需要時補最小能力；不要先做大後台。
- 任何還不能正式保存的操作，不可以偽裝成已保存；必須有明確提示或禁用狀態。
- 每完成一項都要自己驗證，不能只改程式碼就打勾。

## 目前狀態基線
- 現在是 QA 展示模式，不是可營運系統。
- 目前 `config.js` 是 `isMock: true` 且 `baseUrl: ''`。
- 目前主流程資料來自 `mock/qaSeed.ts` 和 `wx` storage。
- 目前商品加入/移除主要是頁面內狀態或 QA 提示，未完成跨頁正式保存。
- 目前登入、OpenID、角色權限、正式資料庫、雲函式/API 尚未形成可用閉環。
- 目前 27 個 `app.json` route 有頁面檔案，但尚未完成微信 DevTools/真機逐頁 GUI 驗證。

## 完整 MVP 的定義
真人可用 MVP 必須讓一位導遊/領隊完成以下閉環：

1. 登入小程序。
2. 建立或編輯一個团单。
3. 從商品库選商品加入本团商品。
4. 分享或展示該团单給客戶下單。
5. 看到客户订单。
6. 更新或確認收款状态。
7. 關閉小程序再打開後，資料仍存在且狀態正確。

如果以上任一步只能靠 mock、只在單頁存在、或重開後消失，都不能宣稱「真人可用」。

## Phase 0 - 接手與防失憶
- [x] 讀完本文件全文。
- [x] 讀完 `PROJECT_RULES.md`、`CURRENT_TASKS.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`QA_SEED_REQUIREMENTS.md`。
- [x] 執行 `git status --short --branch`，確認只有自己要改的檔案會被提交。
- [x] 確認 `CURRENT_TASKS.md` 有本輪明確任務；若沒有，先更新或請示，不要自行一口氣開做整份 MVP。
- [x] 不要提交 `resume/preview-info.json`、`resume/preview-qr.png`。
- [x] 不要啟動或重開微信 DevTools，除非使用者明確要求。
- [x] 不要使用 `automator.launch(...)`。
- [x] 不要推送遠端、部署、刪除正式資料、安裝新套件或使用網路，除非使用者明確要求。
- [x] 若上下文被壓縮或開始不確定，立刻停止憑記憶操作，重新讀本文件和上述 5 份文件。

## Phase 0.5 - 先修 blocking defects
以下是已知會讓後續 GUI 測試或 MVP 實作歪掉的阻塞缺陷。CLI agent 在做正式資料層、GUI smoke test、或宣稱流程穩定前，必須先修這些問題，並把結果寫回 `CURRENT_TASKS.md` 或 `HANDOFF.md`。

- [x] 修正 eventChannel 使用防護：`sub-pages/groupOrder/product-picker/index.ts`、`sub-pages/product/add/index.ts` 等使用 `getOpenerEventChannel()` 的地方，已處理沒有 opener、直接進頁、emit 拋錯、返回失敗等情境，不可因單獨打開頁面而崩潰。
- [x] 修正 QR 空字串處理：`sub-pages/groupOrder/detail/index.ts` 在 `qrCodeUrl` 為空或非法時，不可直接呼叫 `wx.previewImage` 預覽空字串；要先顯示「暂无团单二维码」或 fallback 狀態。
- [x] 修正客戶訂單 id 型別比對：`pages/customerOrders/index.js` 等從 `dataset` 取得的 id 可能是字串，seed/model 裡可能是數字；查找前要統一型別，避免點擊訂單卻顯示「未找到订单资料」。
- [x] 修正商品搜尋與狀態篩選一致性：`pages/productManagement/index.ts` 的搜尋、上下架、刪除、狀態篩選都必須走同一個 filter/update 路徑，不能搜尋後丟失狀態篩選，或狀態切換後丟失搜尋結果。
- [x] 修完以上缺陷後，至少跑 `npm run lint`、`git diff --check`，並用可行方式驗證相關頁面不再因已知問題阻塞 GUI。

## Phase 0.6 - 稽核追加修正
以下是 2026-07-02 對 Phase 0.5/1 交付的稽核結果。下一位 agent 必須先完成本段，再宣稱 blocking defects 全部關閉或進入 27 route GUI smoke test。

- [x] eventChannel listener 缺失不可再寫成已完成：微信 eventChannel API 無法可靠探測「父頁是否真的有 listener」。請在 `ACCEPTANCE.md` / `HANDOFF.md` 保持這項為「已防護 opener/emit/navigateBack，listener 情境仍需 GUI 驗證」，除非真的用微信 DevTools 驗證過父頁有註冊 listener 且回傳資料成功。
- [x] 修正 `pages/message/index.js` 聊天入口：`wx.navigateTo({ url: \`/pages/chat/index?userId${userId}\` })` 少了 `=`，應避免 GUI smoke 時 route 參數錯誤。
- [x] 補強 `pages/message/index.js` eventChannel 防護：`currentUser.eventChannel.emit('update', user)`、`eventChannel.emit('update', user)` 需要處理 `eventChannel` 不存在、emit 失敗、`getUserById` 找不到 user 的情境，不可因訊息頁或聊天頁異常而崩潰。
- [x] 完成稽核追加修正後，必須跑 `npm run lint`、`git diff --check`、`git status --short --branch`，並把結果寫回 `ACCEPTANCE.md` 和 `HANDOFF.md`。

## Phase 0.7 - 稽核回修與範圍校正
以下是 2026-07-02 對 Phase 2 超前交付後的稽核結果。下一位 agent 必須先完成本段，再開始 Phase 4 商品庫；不得跳到 Phase 5 客戶下單與訂單管理。

- [x] 修正 `pages/message/index.js` 與 `pages/chat/index.js` 的 socket null 防護：目前 `app.globalData.socket` 預設為 `null`，`app.js` 未啟動 `connect()`；訊息頁不可在 `socket.onMessage` 或 `socket.send` 因 socket 缺失而崩潰。若聊天功能非本輪重點，應顯示「聊天能力暂未启用」或安全停用。
- [x] 修正 `pages/groupOrder/index.ts` 篩選後狀態文字不一致：`fetchItineraryList()` 有補 `statusText`，但 `applyFilters()` 直接使用 repository 原資料。搜尋/狀態篩選後仍必須保留 `statusText` 與狀態樣式。
- [x] 校正所有文件中「使用者已確認正式資料層採微信雲開發」的說法：目前只能寫成「建議方案，待使用者確認」。不得把 `DATA_LAYER_DECISION.md` 的建議寫成已拍板決策。
- [x] 校正 Phase 2 checklist 與驗收說法：本輪只能標為 auth adapter / mock fallback / role scope 已完成；正式 OpenID、雲函式 `authLogin`、雲端 `users` 集合仍未驗證或未建立，不得打勾成正式登入閉環。
- [x] 回修後必須更新 `ACCEPTANCE.md`、`CURRENT_TASKS.md`、`HANDOFF.md`，並跑 `npm run lint`、`git diff --check`、`git status --short --branch`。

## Phase 1 - 資料模型與儲存閉環
- [x] 先做正式資料層方案比較與建議，不要直接自行選型實作。比較至少包含：微信雲開發資料庫、明確後端 API；要寫清楚成本、開發速度、登入/OpenID 整合、資料權限、部署維運、未來擴充風險。
- [x] 把建議方案寫入 `CURRENT_TASKS.md` 或新的架構決策文件，等待使用者確認或有明確授權後，才開始實作正式資料層。
- [ ] 使用者確認後，決定 MVP 使用的正式資料層。不要同時做兩套。
- [x] 建立正式資料模型文件，至少包含：users、groupOrders、products、groupOrderProducts、customerOrders、payments 或 paymentStatusHistory。
- [x] 每個資料表/集合都要寫明 owner/guide/customer/provider/admin 權限邊界。
- [x] `mock/qaSeed.ts` 保留為測試資料來源，但不能再是正式操作的唯一資料來源。
- [ ] 建立資料存取層，讓頁面不要直接散落呼叫 storage/mock/API。
- [ ] 所有 create/update/delete 操作要回傳成功/失敗，並在 UI 顯示 loading、成功、失敗狀態。
- [ ] 重開小程序後，已建立的团单、商品、客户订单、收款状态仍能讀回。
- [ ] 驗證：用同一個測試導遊建立資料，關閉再打開或重新載入後資料仍存在。

## Phase 2 - 登入與角色權限
- [x] 接入 auth adapter / mock fallback，建立可替換為 `wx.login` + 雲函式的登入邊界。
- [ ] 接入微信登入並取得正式 OpenID 或等價正式身份識別。
- [x] 建立本地 user profile 初始化流程：第一次登入建立使用者，後續登入讀取原資料。
- [ ] 建立雲端 `users` profile 初始化流程：第一次登入建立雲端使用者，後續登入讀取原資料。
- [x] 定義 MVP 角色：guide、customer、owner/admin。供應商角色可暫緩，但不能留下會誤導人的假入口。
- [x] 導遊只能看自己建立或被授權管理的团单。
- [x] 客戶只能看自己下過的订单，或透過分享進入指定团单下單。
- [x] 管理員/owner 入口若未完成，必須顯示未完成提示，不得假裝可管理全站。
- [x] 移除或改寫 starter 風格登入文案，例如 TDsign、QQ、企微等不屬於本產品 MVP 的入口。
- [x] 驗證：至少用 guide/customer 兩種身份跑一次可見資料範圍。

Phase 2 驗證備註：本輪已完成 auth adapter、mock fallback 與 guide/customer role scope 驗證；因未配置/未執行微信雲函式，正式 OpenID 換取尚未在微信 DevTools 或真機驗證，雲端 `users` 集合也尚未建立。

## Phase 3 - 導遊核心工作流
- [ ] `pages/groupOrder/index` 顯示導遊自己的团单列表。
- [ ] 團單列表支援：正常資料、空狀態、載入中、載入失敗、搜尋/篩選無結果。
- [ ] `sub-pages/groupOrder/add/index` 可建立正式团单。
- [ ] `sub-pages/groupOrder/detail/index` 可讀取正式团单詳情。
- [ ] 團單詳情顯示：狀態、描述、本团商品數、客户订单數、收款統計、分享/二维码入口。
- [ ] `sub-pages/groupOrder/productList/index` 顯示該团单已加入商品。
- [ ] `sub-pages/groupOrder/product-picker/index` 可從商品库加入商品到指定团单，且跨頁保存。
- [ ] 可從本团商品移除商品，移除前要有確認。
- [ ] 不存在或無權限的团单 ID 要顯示錯誤/返回策略，不可白屏或崩潰。
- [ ] 驗證：團單列表 -> 詳情 -> 本團商品 -> 商品庫選擇 -> 加入 -> 返回 -> 重開後仍存在。

## Phase 4 - 商品庫
- 下一輪若被指定「做到 Phase 4」，範圍只到本段為止；不得實作 Phase 5 客戶下單、客戶訂單正式流程或收款確認閉環。
- Phase 4 可以依既有 repository/service 邊界建立商品庫正式資料存取層，但不得在使用者未確認前直接建立雲端資源、部署、推送或改外部環境。
- [x] `pages/productManagement/index` 顯示導遊可用商品。
- [x] `sub-pages/product/add/index` 可新增本地/QA 商品，正式雲端商品新增仍未實作。
- [x] 商品至少包含：名稱、描述、圖片、價格規則、狀態、供應來源或備註。
- [x] 階梯價格要有明確計算規則，不能只顯示字串。
- [x] 商品上下架要能保存到本地/QA repository，正式雲端保存仍未實作。
- [x] 商品刪除或移除要有確認；若只做軟刪除，要在資料模型寫清楚。
- [x] 商品搜索無結果要有空狀態。
- [ ] 驗證：新增商品 -> 列表看到 -> 加入团单 -> 重開後仍存在。

Phase 4 驗證備註：本輪以靜態檢查驗證新增、搜尋/狀態篩選、上下架、軟刪除都走 `ProductService` / `ProductRepository`；未做微信 DevTools GUI，因此「新增商品 -> 列表看到 -> 加入团单 -> 重開後仍存在」未勾。正式雲端保存未實作。

## Phase 5 - 客戶下單與訂單管理
- [ ] 明確定義客戶如何進入团单：分享連結、二维码、或指定 route 參數。
- [ ] 客戶可查看团单商品與價格。
- [ ] 客戶可選商品與數量並提交订单。
- [ ] 建立正式 customerOrder 記錄。
- [ ] `pages/customerOrders/index` 顯示導遊可管理的客户订单。
- [ ] 客户订单至少支援狀態：未付款、客户付款、已确认、已取消。
- [ ] 導遊可確認收款或取消訂單，操作要保存並可追溯。
- [ ] 訂單詳情不能只用 modal 代替；MVP 至少要能看完整商品明細、客戶資料、金額與狀態。
- [ ] 驗證：客戶下單 -> 導遊看到訂單 -> 更新付款狀態 -> 重開後狀態仍正確。

## Phase 6 - UI 收斂與去 starter 化
- [ ] 移除或改寫與產品無關的 starter 頁面內容：home、message、dataCenter、release、search、login、setting。
- [ ] 如果某頁 MVP 不需要，從可見入口移除；若 route 保留，必須有清楚的未完成提示。
- [ ] 全部主流程文案使用簡體中文，且一致使用「开团/团单」語境。
- [ ] 不要混用「行程、团购、内容发布、TDsign」等舊模板語境。
- [ ] 底部 tab 固定為：团单、客户订单、商品库、我的，除非產品文件明確改動。
- [ ] 每個表單要有必填驗證、錯誤提示、提交中狀態、提交成功/失敗回饋。
- [ ] 每個列表要有正常、空、載入、錯誤狀態。
- [ ] 驗證：逐頁檢查無舊模板文案、無遮擋、無假入口。

## Phase 7 - 27 個 route GUI smoke test
- [ ] GUI smoke test 前，先確認 Phase 0.5 的 blocking defects 已修正或明確標記不阻塞；不要帶著已知阻塞 bug 反覆跑 GUI。
- [ ] 在微信 DevTools 或真機逐一打開 `app.json` 的 27 個 route。
- [ ] 每個 route 記錄：可打開、正常資料、空狀態、錯誤/未完成提示。
- [ ] 驗證底部 tab 狀態在真實小程序環境一致。
- [ ] 驗證 toast、modal、floating button、底部 tab 不互相遮擋。
- [ ] 驗證表單輸入、返回、重新進入不造成資料錯亂。
- [ ] 把 GUI 驗證結果寫回 `ACCEPTANCE.md` 和 `HANDOFF.md`。

## Phase 8 - 發布前最低品質門檻
- [ ] `npm run lint` 通過。
- [ ] `git diff --check` 通過。
- [ ] 沒有未處理的 console error、白屏、路由找不到。
- [ ] 沒有將 mock/QA seed 當成正式資料。
- [ ] 沒有把 secrets、token、preview QR、local cache、臨時截圖提交。
- [ ] 使用者可從冷啟動完成導遊核心閉環。
- [ ] README 或 HANDOFF 寫清楚如何啟動、如何驗證、哪些功能還沒做。

## 完成定義
只有當以下全部成立，才可以說「MVP 可真人使用」：

- [ ] 導遊核心工作流可完整跑通。
- [ ] 所有核心操作都正式保存。
- [ ] 登入身份與基本權限可用。
- [ ] 客戶下單與導遊確認收款閉環可用。
- [ ] 27 個 route 完成 GUI smoke test。
- [ ] `npm run lint` 與 `git diff --check` 通過。
- [ ] 未完成項清楚留在 `CURRENT_TASKS.md`/`HANDOFF.md`，沒有用假功能掩蓋。

## 每次提交前規則
- [ ] 只提交本次任務相關檔案。
- [ ] 先跑 `git status --short --branch`。
- [ ] 先跑 `npm run lint`。
- [ ] 先跑 `git diff --check`.
- [ ] 不提交 `resume/preview-info.json`、`resume/preview-qr.png`。
- [ ] 提交訊息要具體，例如 `Document MVP completion checklist`、`Implement group order persistence`。

## CLI agent 壓縮失憶處理
CLI agent 必須假設上下文可能被壓縮導致失憶，並使用以下恢復流程：

1. 每完成一個小階段，就更新 `CURRENT_TASKS.md` 或 `HANDOFF.md`，寫清楚完成、驗證、未驗證、下一步。
2. 若對產品方向、禁止事項、資料模型、驗收標準不確定，不要猜；重新讀本文件和 5 份專案文件。
3. 每次開始新回合，都先用 `git status --short --branch` 檢查工作區，再讀本文件。
4. 不要依賴上一段聊天記憶來判斷完成度；完成度只以本文件、`ACCEPTANCE.md`、實際驗證結果為準。
5. 如果上下文壓縮前來不及完成，至少要把當前狀態寫入 `HANDOFF.md`，再停下。

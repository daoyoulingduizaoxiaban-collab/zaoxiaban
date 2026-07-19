# MVP_COMPLETION_CHECKLIST

## 文件用途
本文件只管理真人可用 MVP 的上线 gate、未完成待办和完成判定。稳定业务原则写在 `DOC/BUSINESS_LOGIC_PRINCIPLES.md`。

本文件不保留已完成历史清单，不写每日进度，不新增第二份角色矩阵。AGENT 开发时按本文找待办，按 `DOC/BUSINESS_LOGIC_PRINCIPLES.md` 判断业务逻辑。BUG 由使用者自行在微信开发者工具实测后口头/对话回报，不再维护 QA BUG 文件。

## 完成判定
每个待办只有同时满足以下条件才可勾选：

- 功能已经实作到正式路径，不只是 local/mock/QA fallback。
- 资料走 service/repository/cloud function 边界，不能由页面直接读写正式云数据库或 mock seed。
- 前端入口和后端权限都符合 `DOC/BUSINESS_LOGIC_PRINCIPLES.md`。
- 在微信开发工具画面完成实际操作验证；只看静态代码、route 存在、旧截图或自动化连接状态不算完成。
- 需要云端资料的项目必须有云端 readback 或等价证据，能证明重开后仍存在。
- 无权、过期、停用、拒绝、资料不归属等负向路径必须被前端隐藏/导向安全画面，并被后端拒绝。

## Gate A - 登录、审核与角色期限
- [ ] A1. 首次微信登录默认进入待审核：
  - 直接打开小程序、首页、搜索、普通扫码或非团单分享路径时，新 OpenID 只能创建 `pending_review` 用户。
  - 新用户不得自动取得 `customer`、`guide`、`provider`、`admin` 或 `owner` 权限。
  - 待审核画面不得显示完整业务 tab、首页快捷入口、商品库、团单、客户订单、资料中心、管理入口或 QA 工具。
  - 待审核画面必须提供刷新/重新检查状态、联系管理员、退出登录或返回安全状态入口。

- [ ] A2. owner/admin 审核入口可用：
  - owner/admin 可以看到待审核用户列表，并能查看必要申请资料。
  - 通过审核时必须能一次选择多个角色，并能设置角色使用期限。
  - 拒绝、停用、改角色、续期都必须有明确操作和正式文案。
  - 审核结果必须保存 `reviewStatus`、`roles[]`、primary `role`、`roleExpiresAt`、`reviewedBy`、`reviewedAt`、`updatedAt` 与可选备注。

- [ ] A3. 角色期限过期后不可使用系统：
  - 期限已过用户即使完成微信登录，也不能进入业务首页或业务 tab。
  - 过期画面必须显示正式不可用状态，并提供刷新/联系管理员/退出入口。
  - 后端/cloud function 必须拒绝过期账号的业务读写。
  - 管理员续期后，用户不需要重新安装小程序即可刷新到可用状态。

- [ ] A4. 权限刷新与降权即时生效：
  - 小程序启动、前台恢复、进入首页、进入我的页、进入权限敏感页、提交保存或调用业务云函数前，必须刷新或确认云端 profile。
  - 用户从 `approved` 变成 `disabled`、`rejected`、过期或角色不符时，前端必须清掉旧权限缓存并导向安全状态。
  - 旧本地 storage、QA override、debug 参数或旧缓存不得覆盖云端最新用户状态。

- [ ] A5. owner/admin 安全边界：
  - 第一位 owner 必须来自受控 allowlist 或等价机制，不得由前端自选。
  - admin 不能把自己升成 owner，不能修改/停用 owner，不能指派 owner。
  - owner/admin 的审核、拒绝、停用、改角色、续期必须写入操作记录。

## Gate B - 多角色、受限 customer 与角色入口
- [ ] B1. 多角色身份模型可用：
  - 同一 OpenID 可以同时拥有多个正式角色，例如团主也能作为 customer 购买别人的团单。
  - 系统必须支持 `roles[]` 与当前场景的 `effectiveRole` 或等价有效身份。
  - 页面、tab、按钮、列表操作和后端权限不能只靠单一 `role` 判断。
  - 我的页/设置页应清楚显示已审核角色和当前场景，避免把受限 customer 误认为完整 customer。

- [ ] B2. 直接注册 customer 必须审核：
  - 用户从普通入口注册时，不得自动成为完整 customer。
  - 完整 customer 权限必须由 owner/admin 审核通过后才可使用。
  - 未审核 customer 不得进入完整客户中心、完整业务 tab 或其他客户资料。

- [ ] B3. 团单分享受限下单可用：
  - 用户从合法团单分享链接、团单码或有效 share token 进入时，可以获得该团单的受限下单能力。
  - 受限 customer 只能查看该团单、该团商品、自己的订单、自己的付款状态和付款声明。
  - 受限 customer 不得进入商品库管理、团主工作台、供应商后台、资料中心、用户审核或其他客户资料。
  - 分享入口必须验证团单有效、未过期、可售、未删除、未停用。
  - 无效分享路径必须显示正式错误页或返回安全页面，不得放开完整客户权限。

- [ ] B4. 已审核团主进入别人分享时使用 customer 场景：
  - 已审核团主从别人团单分享进入时，应进入客户下单场景，而不是强制跳回团主工作台。
  - 完成或退出分享流程后，仍能回到原本团主身份首屏。
  - 团主身份创建的商品/团单与 customer 身份创建的订单必须分开归属。

- [ ] B5. 全系统角色入口隐藏：
  - 未登录、待审核、拒绝、停用、过期、角色不符、资料不归属时，不得显示不可用业务入口。
  - 需覆盖 tab/custom tab bar、首页快捷入口、My 服务列表、核心列表/详情、空状态 CTA、分享/扫码入口、直达 route、返回 fallback。
  - 不能靠点击后 toast、禁用按钮、未完成文案、QA/mock/Seed/MVP 字样挡住正式用户。
  - 后端仍必须拒绝无权读写，不能只靠前端隐藏。

## Gate C - Provider 供应商正式角色
- [ ] C1. provider 申请与审核流程：
  - 用户可申请成为 provider。
  - owner/admin 可通过、拒绝、停用或调整 provider 状态。
  - 未审核、拒绝、停用或过期 provider 不得进入供应商业务功能。
  - 审核状态和角色变更必须保存到云端并写入操作记录。

- [ ] C2. provider 资料维护：
  - 已审核 provider 可以维护供应商名称、联系方式、介绍、服务范围、商品或服务说明等必要对外资讯。
  - 保存后重新进入、刷新或重新登录必须回填。
  - provider 只能维护自己的供应商资料，不能查看或修改其他供应商后台资料。

- [ ] C3. provider 商品管理：
  - 已审核 provider 可以新增、编辑、上下架、删除或停用自己的商品或服务。
  - 商品必须包含客户和团主选品所需的名称、图片、价格、说明、状态与供应商归属。
  - provider 不得修改其他供应商、团主或系统商品。
  - provider 被停用后不得新增或修改商品，其商品不得被新团单继续选用。

- [ ] C4. 团主选用 provider 商品：
  - 团主开团或维护本团商品时，必须能选择可用 provider 商品。
  - 团单商品必须保存供应商、价格、状态和商品快照。
  - 下架、停用、无权或不可售商品不得被新团单选用。
  - 既有团单/订单必须保留历史资料并显示正式状态，不能直接删除造成追溯断裂。

- [ ] C5. customer 可见供应商资讯：
  - customer 在团单商品、下单页、订单详情中能看到必要供应商资讯。
  - customer 不得看到供应商后台资料、敏感营运资料或其他供应商不可公开资料。
  - provider 默认不得查看客户个人付款资料或团主客户资料中心。

## Gate D - 团主开团、商品与团单闭环
- [ ] D1. 团主商品库正式保存：
  - 授权团主可以新增、编辑、上下架、软删除自己可管理的商品。
  - 商品保存后列表、详情、开团选品都能立即读取更新。
  - 重新进入或重新登录后资料仍存在。
  - 团主不得修改不属于自己的 provider 商品或其他团主商品。

- [ ] D2. 开团流程正式可用：
  - 授权团主可以建立团单，填写商品、时间、数量、收单规则、联系说明等必要资料。
  - 团单保存后列表与详情能看到新团单。
  - 团主只能管理自己创建或被授权管理的团单。
  - 直达不存在、无权或已停用团单时，必须显示安全状态或返回可用页面。

- [ ] D3. 本团商品维护：
  - 团主能为团单加入、移除或调整本团商品。
  - 本团商品必须保存商品快照、价格快照、供应商归属和可售状态。
  - 商品下架或供应商停用后，新团单不得继续选用；既有团单保留历史状态。

- [ ] D4. 团主客户订单视图：
  - 团主能查看自己团单下的客户订单、付款状态与必要客户下单资料。
  - 团主不得查看其他团主的订单资料。
  - 列表、详情、空状态、错误状态、加载状态都必须是正式文案。

## Gate E - Customer 下单、付款与凭证
- [ ] E1. customer 下单流程：
  - customer 可通过合法团单入口查看本团商品与价格。
  - customer 可选择商品和数量并提交订单。
  - 订单必须记录 group order、customer principal、items、金额、状态、付款资料、创建/更新时间。
  - customer 只能查看和处理自己的订单。

- [ ] E2. 付款声明凭证选填：
  - customer 声明付款时，付款凭证图片不是必填项。
  - 付款方式、付款金额和必要备注必须足以提交付款声明。
  - 系统不得因没有图片凭证阻止付款声明，但必须显示「未上传凭证」或等价正式状态。
  - 若有凭证图片，必须走正式 media picker 和持久化存储路径，不能保存临时本地路径到正式云端资料。

- [ ] E3. 团主确认收款：
  - 团主只能确认自己团单下的订单收款。
  - 团主可查看待确认、已确认、已拒绝/取消等付款状态。
  - 确认、拒绝、取消必须保存状态历史、操作者、时间、金额和必要备注。
  - customer 重新进入后能看到自己的付款状态变化。

- [ ] E4. 付款凭证权限：
  - 凭证图片仅允许客户本人、所属团主、owner/admin 按权限查看。
  - 无权角色不得看到凭证数量、图片详情或敏感付款资料。
  - 订单详情、付款历史、团主确认收款页必须显示付款方式、声明金额、备注、凭证数量或未上传凭证状态。

## Gate F - 操作记录与审计
- [ ] F1. 操作记录写入：
  - 至少记录登录/退出、用户审核与角色变更、开团与本团商品维护、商品新增/编辑/上下架/删除、订单状态流转、付款提交/确认/拒绝/取消、关键设置变更、供应商资料或商品变更。
  - 每条记录至少包含 actor principal、OpenID 脱敏展示、当时角色/effectiveRole、动作、资源类型、资源 id、操作摘要、结果、发生时间和必要上下文。
  - 同一操作不可重复写入；重试导致重复提交时需有幂等标识或等价去重机制。
  - 不得写入完整 OpenID、手机号、支付口令等敏感明文。

- [ ] F2. 操作记录查看：
  - owner/admin 可以查看自己的管理操作记录。
  - 团主可以查看自己的团单、商品、收款相关操作记录。
  - 未审核用户、访客、拒绝、停用、过期用户不显示操作记录入口。
  - 默认不开放普通角色查看其他人的操作记录。

- [ ] F3. 操作记录查询体验：
  - 提供操作记录列表和查看页。
  - 支持按时间范围、操作类型、对象类型、状态筛选。
  - 支持分页、空状态、错误状态和加载状态。
  - 列表项可跳转到对应对象详情，但必须受权限限制。

- [ ] F4. 操作记录后端权限：
  - 查询 API 必须验证当前用户身份、审核状态、角色期限和资料归属。
  - 无权查询他人记录时，前端不可见且后端拒绝。
  - 日志保留期建议至少 12 个月；若要归档或清理，必须先定义策略，不得静默删除。

## Gate G - Owner 运营验收角色预览
- [ ] G1. owner OpenID 正式来源：
  - 使用者本人微信 OpenID 必须被设置为第一位正式 owner。
  - OpenID 不得写进公开报告、截图、commit message 或普通文档，只能进入受控配置、云函数环境变量或本地验证备注。
  - `authLogin` 识别该 OpenID 时必须返回 owner 与 `approved`，并同步云端 `users` profile。

- [ ] G2. 真实身份与预览身份分离：
  - `realProfile` 永远代表当前微信 OpenID 的真实云端 owner 身份。
  - `effectiveProfile` 只代表当前页面、入口、权限与业务流程的预览视角。
  - 不能把真实 `users.role` 从 owner 改成其他角色来做测试，避免唯一 owner 被降权或锁死。

- [ ] G3. 角色预览入口：
  - 只有真实 owner 且状态为 `approved` 可以看到角色预览入口。
  - 普通用户、待审核、拒绝、停用、非 owner 不得看到或调用该能力。
  - 入口建议放在「我的」或「设置」的 owner 管理区，正式名称可用「运营验收模式」或「角色预览」。
  - 面板必须显示当前真实身份、当前预览身份，并提供退出预览。

- [ ] G4. 预览角色覆盖：
  - 至少支持 `visitor`、`pending_review`、`rejected`、`disabled`、`customer`、`guide`、`provider`、`admin`、`owner`。
  - 切 `pending_review`、`rejected`、`disabled` 时必须显示正式状态页并隐藏业务入口。
  - 切 `customer` 后只能看到 customer 可用入口并能走客户流程。
  - 切 `guide` 后能建商品、开团、查看客户订单并确认收款。
  - 切 `admin` 后能看到审核入口，但不能修改 owner 或自提权。
  - 切回 `owner` 后 owner 管理入口恢复且预览状态清除。

- [ ] G5. 预览后端安全：
  - 前端传来的 simulation 参数不能被直接信任。
  - 后端必须先确认真实 OpenID 是 approved owner，才允许启用预览身份。
  - 非 owner 或未审核 owner 传入 simulation 参数时，后端必须拒绝。
  - 模拟资料必须用 effective principal 隔离，避免污染普通正式列表或绕过订单/团单归属。

## Gate H - 命名、文案与正式 UI
- [ ] H1. 用户可见角色命名统一为「团主」：
  - 所有正式 UI 文案、tab、按钮、空状态、错误提示、审核入口、角色说明、商品选品、开团、客户订单、收款流程中，不得再把用户可见角色称为「导游」「领队」「导游/领队」。
  - 代码内部既有 `guide` role key、资料字段、云端集合字段、API action、历史迁移兼容逻辑可以暂时保留，但不得外露给正式用户。
  - 文档提到内部 key 时必须写清楚「内部 role key 为 `guide`，用户显示为团主」。

- [ ] H2. 正式文案清理：
  - 正式模式不得显示 QA、mock、Seed、debug、MVP、未完成、后续、待串接、OpenID 未验证、测试账号等内部字样。
  - 未登录、待审核、拒绝、停用、过期、无权、空状态、错误状态都必须使用正式简体中文产品文案。
  - QA/mock/demo 模式若保留，必须清楚标示为本地/QA/demo，且不得被正式用户看到。

- [ ] H3. GUI layout/style 稳定性：
  - 资料中心、图示字体、固定 navbar、按钮、表单、弹窗、底部 tab 需完成微信开发工具画面检查。
  - 不能有文字溢出、元素重叠、按钮无法点击、弹窗遮挡关键操作、底部 tab 与页面内容冲突。
  - loading、empty、error、disabled、no-permission 状态都要有稳定画面。

## Gate I - 微信开发工具画面验收
- [ ] I1. 29 route GUI smoke：
  - `app.json` 内所有 route 必须能在微信开发工具打开。
  - 每个 route 至少检查页面可渲染、无明显空白、无阻塞 console error、可返回或导向安全页面。
  - 直达带 id 页面、无 id 页面、无权页面、错误 id 页面都要有安全状态。

- [ ] I2. 真实 workflow smoke：
  - tab 切换、带 id 详情、eventChannel picker、客户分享入口、列表卡片、空状态 CTA、返回 fallback 必须用真实入口验证。
  - 不能只靠手动改 route、旧截图或静态 route 存在判断通过。
  - 每条 workflow 必须留下微信开发工具画面截图、操作记录或自动化 readback。

- [ ] I3. 核心闭环验收：
  - owner/admin 审核用户并指派角色。
  - provider 建资料和商品。
  - 团主选择商品并开团。
  - customer 从合法团单入口下单。
  - customer 声明付款，且凭证选填路径可用。
  - 团主确认收款。
  - owner/admin 与团主查看自己的关键操作记录。
  - 重开小程序后核心资料仍存在。

- [ ] I4. 负向路径验收：
  - 未登录、待审核、拒绝、停用、过期、角色不符、资料不归属、分享无效、订单不归属、团单不归属都必须被挡住。
  - 前端必须隐藏或导向安全状态，后端/cloud function 必须拒绝无权请求。
  - 不能只用前端 toast 或 disabled button 作为权限完成证据。

## Gate J - 真人可用性與流程整體體驗（由 AI 代理直接落地）
- [ ] J1. 清除正式界面測試感字串（對應「正式感不足」）：
  - 代理修改：先在 `config.js` + 所有 UI 文案中掃描 `云端团单`、`测试`、`DEBUG`、`自动化`、`待串接`、`商品测试/測試`，把這些字樣移除。
  - 清單頁：`pages/home/index`、`pages/groupOrder/index`、`pages/my/index`、`pages/release/index`、`pages/productManagement/index`、`pages/customerOrders/*`、`pages/message/index`。
  - 實作要求：正式模式下只顯示產品可交付資訊；有 QA/mock seed 資訊只在 QA 開關明確標籤頁才可見。
  - 驗收：正式登入後首頁、消息、列表、分享頁不得出現上述測試字樣；QA 開啟提示需包含明顯環境標籤且不可進入主流程。

- [ ] J2. 拆開 DEV 測試能力與正式入口（對應「DEV 設定仍開著 mock/seed fallback」）：
  - 代理修改：在 `config.js` 設定層把 `allowMockIdentity`、`allowSeedDataFallback`、`allowQaTools` 與 `useCloudBusinessData` 的狀態與 `appEnv` 可視化；在 UI 入口加 `isProd` 硬關。
  - 代理修改檔案：`config.js`、`app.js`、`services/auth/authService.js`、`repositories/cloudBusinessRepository.js`、`DOC/MVP_COMPLETION_CHECKLIST.md`（更新前後行為）。
  - 實作要求：DEV 可手動切測試模式；PROD 強制不提供 mock/seed/mock identity fallback 選項；切換環境後刷新首頁/我的頁/核心列表。
  - 驗收：`getBootstrapProfile`/`isRolePreview` 不可在 PROD 生效；在 PROD 相關功能路徑看不到 mock 開關。

- [ ] J3. 重新分組我的頁入口（對應「我的頁入口太雜」）：
  - 代理修改：重構 `pages/my/index.js`、`pages/my/index.wxml`，將項目改為三區 `常用工作`、`資料與權限`、`管理`。
  - 實作要求：每區塊只保留同層級任務，不同角色的項目要被同頁隱藏；角色入口與權限入口不得混在同一層級按鈕。
  - 驗收：一般团主/供应商/owner/admin/受限 customer 進入「我的」後，首頁首屏一次可理解唯一主流程目標。

- [ ] J4. 收斂開團入口（對應「入口重複」）：
  - 代理修改：保留 `/pages/groupOrder/index` 或 `/pages/release/index` 作為唯一主要創建入口之一，其他頁面只留「跳轉到主入口」按鈕。
  - 代理修改檔案：`app.json`（tabBar/路由）、`pages/my/index.js`、`pages/groupOrder/index.ts`、`pages/release/index.js`、`utils/navigation.js`。
  - 實作要求：去掉三處平行入口造成的多層中介；所有開團操作都可直接打開同一主流程。
  - 驗收：從 `/pages/my/index`、`tabBar`、`工作台` 任一路徑進入開團，最後落到同一個創建流程。

- [ ] J5. 開團表單對真人友善化（對應「開團表單不夠真人友善」）：
  - 代理修改：`sub-pages/groupOrder/add/index.wxml` 及 `sub-pages/groupOrder/add/index.ts`。
  - 實作要求：
    - 將出團時間、收單截止改為微信日期時間 picker，禁止自由文本。
    - 付款說明/取貨集合提供可編輯模板（預填文案 + 清晰說明）。
    - 新增欄位必填/格式校驗（時間順序、金額、數量邊界）。
  - 驗收：空資料必有校驗失敗提示；picker 可正常儲存後再次編輯回填。

- [ ] J6. 文字文案改為產品語言（對應「系統狀態文案太工程化」）：
  - 代理修改：`pages/*` 全站文案掃描並替換 `资料已同步`、`当前资料仅保存到本设备`、`资料会同步保存` 類字串。
  - 實作要求：正式模式只保留 `已保存/保存失败/权限不足/网络问题` 這類產品友善字句；技術實作細節放 QA/設定頁。
  - 驗收：關鍵保存節點（新增/編輯/提交）文案一致且無 storage/mock 表述。

- [ ] J7. 明確商品列表定位（對應「商品庫有兩套列表體驗」）：
  - 代理修改：`pages/productManagement/index.ts/.wxml`、`sub-pages/product/list/index.ts/.wxml`。
  - 實作要求：一個入口標為「管理商品」，另一入口標為「瀏覽商品」（如保留）；兩者功能差異寫在頁面標題與空狀態文案中。
  - 驗收：同一角色不會看不懂「列表」到底是管理還是查看；角色切換後只留可用列表。

- [ ] J8. 商品刪除風險清晰提示（對應「商品刪除風險提示不足」）：
  - 代理修改：`pages/productManagement/index.ts/.wxml`、`services/product/productService.js`。
  - 實作要求：刪除確認視窗加入「下架/軟刪除，不影響歷史團單與訂單」提示；若商品已被團單使用，補充「不影響歷史追溯」。
  - 驗收：完成刪除前至少顯示風險提示與二階確認；誤刪風險事件可回報支持。

- [ ] J9. 商品上下架控件可視化（對應「商品狀態切換不直覺」）：
  - 代理修改：`pages/productManagement/index.ts/.wxml`、`components`（若有共用開關元件）。
  - 實作要求：把「已上架，点击下架」改為可辨識狀態的 toggle/segmented control；顯示當前狀態與切換後影響文案。
  - 驗收：誤操作率下降；關鍵操作需顯示確認並在 API 失敗時回滾。

- [ ] J10. 供應商申請流程正式化（對應「供應商申請流程不夠正式」）：
  - 代理修改：`pages/providers/index.js`、`pages/providers/index.wxml`、`pages/providers/edit/*`、`pages/userReview/index.*`、`services/auth/authService.js`。
  - 實作要求：從「直接更新 profile」改為「提交供應商申請單」：含申請人、時間、審核狀態、審核人、審核時間、備註字段。
  - 驗收：供應商提交後可在 owner/admin 審核列表看到申請；申請結果可回寫並可追溯。

- [ ] J11. 審核與停用流程防誤操作（對應「使用者審核頁過於簡化」）：
  - 代理修改：`pages/userReview/index.ts/.wxml`、`services/auth/authService.js`、相關審核 API。
  - 實作要求：
    - `拒絕`、`停用` 加二次確認對話框；
    - 操作必填原因備註欄位；
    - `reviewExpiresAt` 用日期選擇器；
    - 錄入 `reviewedAt`、`reviewedBy`、`reviewResult`、`reviewNote`。
  - 驗收：所有高風險操作必有理由且可稽核回看。

- [ ] J12. 客戶分享下單路徑加 token 驗證（對應「客戶下單入口缺少分享安全感」）：
  - 代理修改：`pages/customerOrders/edit.js`、`pages/customerOrders/edit.wxml`、`repositories/groupOrderRepository.js`、`services/customerOrder/customerOrderService`、`cloudfunctions/businessData/index.js`。
  - 實作要求：下單入口不只靠 `groupOrderId`；必須檢查 share token、團單狀態、截止時間、可售性。
  - 驗收：非法/過期/無效分享進入時，導向安全頁並顯示明確拒絕原因；不能直接進入完整客戶流程。

- [ ] J13. 報表名稱與行為一致（對應「導出報表不是真正報表」）：
  - 代理修改：`sub-pages/groupOrder/detail/index.ts`、`sub-pages/groupOrder/detail/index.wxml`、`pages/customerOrders/edit/index.js` 相關 API。
  - 實作要求：將 `导出报表` 文案與功能對齊：若只做文字摘要複製，改文案為 `复制报表摘要`；若做下載需提供文件輸出。
  - 驗收：用語與實際行為一一對應，無誤導字眼。

- [ ] J14. 將訊息頁定位為訂單提醒（對應「消息頁像訂單狀態列表」）：
  - 代理修改：`pages/message/index.ts/.wxml`。
  - 實作要求：頁名、說明、卡片文案改為「订单提醒」導向；入口文案從聊天/對話語境改為訂單狀態提醒。
  - 驗收：點擊訊息進入後不會看到聊天術語，流程清楚為「查看訂單狀態」。

- [ ] J15. 聊天頁降級到最小交付（對應「聊天頁目前應隱藏或降級」）：
  - 代理修改：`pages/chat/index.ts/.wxml`，以及我的頁/首頁對話入口引用。
  - 實作要求：若無完整即時聊天，移除正式「客户沟通」入口；改成空態引導、公告型頁或導回訂單相關頁面。
  - 驗收：一般使用者不會以為可進行即時對話，且不會掉入未完成功能。

- [ ] J16. 團單分享/QR 行為實際化（對應「QR/分享體驗不完整」）：
  - 代理修改：`sub-pages/groupOrder/detail/index.ts`、`sub-pages/groupOrder/detail/index.wxml`、`pages/customerOrders/edit/index.js`、`app.js` 分享路徑設定與 `onShareAppMessage` 入口。
  - 實作要求：顯示一致文案，至少明確「複製鏈接分享」；若未實作 QR 輸出，移除 `暂无团单二维码` 文案，改為可實現的替代行為。
  - 驗收：文案、按鈕、實際功能一致；若有 QR 生成則同步測試；若無則不得承諾。

- [ ] J17. 全量身份場景 GUI smoke（對應「角色/身份模型還需要真人場景驗證」）：
  - 代理修改：在驗收文件與測試腳本中補足場景清單（角色：團主、未審核、受限 customer、provider、admin、owner、雙角色切換）。
  - 實作要求：每個角色至少驗證 `我的`、`首页`、`groupOrder 列表`、`客戶訂單`、`商品庫`、`消息提醒`、`分享入口`、`退出返回`。
  - 驗收：每場景留存畫面/流程證據；未授權入口被隱藏且後端仍拒絕越權請求。

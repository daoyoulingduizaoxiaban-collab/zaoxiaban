# PAGE_MAP — 页面跳转契约

> **这份是什么**：全站 19 个页面的「谁能进 / 从哪进 / 带什么参数 / 出去哪 / 返回落在哪」的**唯一口径**。
> **怎么用**：动任何页面跳转前先查这份。
> **和别的文件的分工**：`BUSINESS_LOGIC_PRINCIPLES.md` 定「业务上应该长怎样」（A12 入口编排、A13 鉴权闸门）；这份定「代码层面具体跳去哪」。欄位口径查 `FIELD_DICT.md`。
>
> **状态**：2026-08-25 全站扫描后建立，2026-08-26 随删页/收敛更新。标 ⚠️ 的是**现况有问题、待收敛**，标 ❓ 的是**待拍板**。收敛完成后把标记拿掉。

---

## 0. 导航 API（只准用这几个）

全部在 `utils/navigation.js`：

| 函式 | 用途 |
| --- | --- |
| `navigateByUrl(url, options)` | 一般跳转。自动判断目标是不是 tab 页，是就走 `switchTab` |
| `redirectByUrl(url, options)` | 取代当前页（登录成功后用） |
| `navigateBackOrTab(fallbackUrl)` | 返回上一页；栈空时落到 `fallbackUrl` |
| `normalizeRouteUrl(value, fallback)` | 清洗外部传入的路径（防 `..`、防协议相对） |
| `parseRouteQuery(query)` / `consumeTabRouteQuery(path)` | tab 页取回被暂存的 query |

**禁止**页面直呼 `wx.navigateTo` / `wx.redirectTo` / `wx.switchTab` / `wx.reLaunch` / `wx.navigateBack`。
白名单：`utils/navigation.js` 自身、`custom-tab-bar/index.js`（tab 切换是框架机制）。

---

## 1. 页面总表

**权限栏**：`useAccessPage` = 用共享行为；`requireLogin` = 未登录导登录页；「自写」= 页面自己写 `canUseFeature` 判断。

### 1.1 Tab 页（4 个）

| 页面 | 接受参数 | 权限闸门 | 返回键 | 出去哪 |
| --- | --- | --- | --- | --- |
| `pages/groupOrder/index` | 无 | `useAccessPage` + `requireLogin` + `GROUP_ORDERS` | 无（tab 页） | `groupOrder/add?copyFrom=&from=`<br>`groupOrder/add?from=`<br>`groupOrder/detail?id=`<br>`login?redirectTo=` |
| `pages/customerOrders/index` | `orderId`<br>`status` | `useAccessPage` + `requireLogin` + `CUSTOMER_ORDERS` | 无 | `customerOrders/edit?groupOrderId=`<br>`login?redirectTo=` |
| `pages/userReview/index` | 无 | `useAccessPage` + `requireLogin`<br>自写 `isOwnerOrAdmin` | 无 | 无 |
| `pages/my/index` | 无 | 自写（`onShow` 未登录 → `login?gate=1`） | 无 | `login?gate=1` ⚠️ `wx.reLaunch` 直呼<br>`login?redirectTo=`<br>`search?from=`<br>`dataCenter` / `setting` / `tourGuides` / `providers` / `operationLogs`<br>`tourGuides/edit`（申请团主，不带 id） |

> ⚠️ **`consumeTabRouteQuery` 只有 `customerOrders` 会读**。`navigateByUrl` 对其余 3 个 tab 记下的 query（`utils/navigation.js:44` `rememberTabRouteQuery`）会永久残留在 storage。

### 1.2 团单（sub-pages，3 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 保存成功后 |
| --- | --- | --- | --- | --- |
| `sub-pages/groupOrder/detail/index` | `id`<br>`readonly=1` | 无 `useAccessPage`<br>靠后端回传 `canManageGroupOrder` 分流 | ✅ `/pages/groupOrder/index` | — |
| `sub-pages/groupOrder/productList/index` | `id`<br>❓ 另接受 `productId`（无来源，见 §4） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ✅ 动态 `detail?id=<团单>`，无 ID 退团单列表 | — |
| `sub-pages/groupOrder/add/index` | `from`（来源页）<br>`id`（编辑）<br>`copyFrom`（复制） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ✅ `custom-back` + `bind:back`，fallback = `sourceUrl` | ✅ 300ms → `navigateBackOrTab(sourceUrl)` |

### 1.3 目录与编辑页（6 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 保存成功后 |
| --- | --- | --- | --- | --- |
| `pages/tourGuides/index` | 无 | `useAccessPage` + `requireLogin` + `TOUR_GUIDES` | `nav navType=my` → `navigateBackOrTab('/pages/my/index')` | — |
| `pages/tourGuides/edit/index` | `id`（缺省用 `profile.id`） | 自写 `canUseFeature` + `isOwnerOrAdmin` + `hasRole(GUIDE)` | ✅ `/pages/my/index` | 300ms → `/pages/my/index`<br>申请模式原地不跳，重跑 `initPage({})` |
| `pages/providers/index` | 无 | `useAccessPage` + `requireLogin` + `canUseProviderPortal`<br>❓ 无 featureKey | 无返回键 | `providers/edit?id=` |
| `pages/providers/edit/index` | `id` | 自写 `canUseProviderPortal` | ✅ `/pages/providers/index` | 300ms → `/pages/providers/index` |
| `pages/customerOrders/edit/index` | `groupOrderId`<br>`shareToken`<br>`scene`（扫码）<br>🚧 代下单模式参数见 §5（`C-PROXY-ORDER`） | 自写 `CUSTOMER_ORDER_CREATE` → `accessDenied`<br>🚧 代下单需放行本团 `guide`，见 §5（`C-PROXY-ORDER`） | ✅ 动态 `detail?id=<团单>`，无 ID 退客户订单列表 | `showModal` 确认 →`/pages/customerOrders/index` |
| `pages/my/info-edit/index` | 无 | 自写 `INFO_EDIT` | ✅ `/pages/my/index` | ✅ 300ms → `/pages/my/index` |

### 1.4 其余（6 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 出去哪 |
| --- | --- | --- | --- | --- |
| `pages/login/login` | `redirectTo`<br>`gate=1`<br>`tester` | 无 | ✅ sub-nav `fallback-url="/pages/my/index"`，`gate` 时隐藏返回键 | 登录后 `redirectByUrl(redirectTo)`，fallback `/pages/my/index` |
| `pages/search/index` | `from` | 自写 `SEARCH` | ✅ `custom-back` + `bind:back`，fallback = `sourceUrl \|\| /pages/my/index` | `groupOrder/detail?id=`<br>`customerOrders?orderId=` |
| `pages/operationLogs/index` | 无 | `useAccessPage` + `requireLogin` + `OPERATION_LOGS` | ✅ sub-nav `fallback-url="/pages/my/index"` | 无 |
| `pages/dataCenter/index` | 无（只有 `onShow`，无 `onLoad`） | `useAccessPage` + `requireLogin` + `DATA_CENTER` | ✅ sub-nav `fallback-url="/pages/my/index"` | 无 |
| `pages/setting/index` | 无 | 自写 `INFO_EDIT` | ✅ sub-nav `fallback-url="/pages/my/index"` | `login?redirectTo=`<br>❓ `onEleClick` 有 url 跳转分支，但 `menuData` 无任何项带 `url` |
| `pages/feedback/index` | 无 | 只有 `config.isDev` 判断 | ✅ `/pages/my/index` | ✅ 300ms → `navigateBackOrTab('/pages/my/index')` |

---

## 2. 进入来源反查

| 目标页 | 谁会跳进来 |
| --- | --- |
| `groupOrder/detail` | `groupOrder/index`（`?id=`）、`search`（`?id=`）、`groupOrder/productList`（⚠️ `wx.redirectTo` 直呼） |
| `groupOrder/add` | `groupOrder/index`（`?copyFrom=&from=` / `?from=`）、`groupOrder/detail`（`?id=&from=detail`） |
| `groupOrder/productList` | `groupOrder/detail` |
| `customerOrders/index` | tab、`search`（`?orderId=`）、`customerOrders/edit` |
| `customerOrders/edit` | `customerOrders/index`（`?groupOrderId=`）、`groupOrder/detail` 的分享 / 小程序码（`?groupOrderId=&shareToken=`）、扫码 `scene` |
| `customerOrders/edit`（🚧 代下单模式） | `sub-pages/groupOrder/detail` 的团主管理区「代客下单」按钮（未实作，见 §5 `C-PROXY-ORDER`） |
| `providers/index` | `my`（管理区；商品库删除后搬回来） |
| `providers/edit` | `providers/index` |
| `tourGuides/index` | `my` |
| `tourGuides/edit` | `my`（⚠️ 不带 id）、`tourGuides/index`（带或不带 id） |
| `login` | `useAccessPage.requireLogin`（自动带 `redirectTo`）、`my`（`?gate=1`）、`groupOrder`、`customerOrders`、`setting`、`my/info-edit`、`customerOrders/edit` |
| `search` / `dataCenter` / `setting` / `operationLogs` / `my/info-edit` | `my`（`my/info-edit` 走「设置」页的「账号资料」） |
| `feedback` | `custom-tab-bar`（⚠️ `wx.navigateTo` 直呼，仅 `isDev` 注入） |

---

## 3. 现况问题清单（待收敛）

### 3.1 返回键 ✅ 已收敛（2026-08-26）

**口径**：每个用 `sub-nav` 的页面都必须在 wxml 明确写 `fallback-url`，值取第 2 节的主要来源页；来源随参数变动的用动态值。写了 `onBack` 就必须绑，否则删掉。

| 页面 | 返回落点 |
| --- | --- |
| `feedback`、`my/info-edit`、`tourGuides/edit`、`dataCenter`、`operationLogs`、`setting`、`login` | `/pages/my/index` |
| `providers/edit` | `/pages/providers/index` |
| `groupOrder/detail` | `/pages/groupOrder/index` |
| `groupOrder/productList` | 动态 `detail?id=<团单>`，无 ID 退 `/pages/groupOrder/index` |
| `customerOrders/edit` | 动态 `detail?id=<团单>`，无 ID 退 `/pages/customerOrders/index` |
| `groupOrder/add` | 动态 `sourceUrl`（`?from=`），`custom-back` + `bind:back` |
| `search` | 动态 `sourceUrl`，`custom-back` + `bind:back` |

顺带修掉的：

- `providers/edit`、`tourGuides/edit`、`customerOrders/edit` 三个 `onBack` 从未绑到 wxml（死码），且第三个落点还是错的 → 改用 `fallback-url` 后与之等价，已删。
- 商品浏览页挂的 `<nav>` 全站都没注册 → 整条导航列不渲染、根本没有返回键 → 当时换成 `sub-nav`；该页之后随商品库一起删档（2026-08-26），但这条踩坑已固化成 `check-contract.js` 的 C2 规则。
- `groupOrder/detail` 进「编辑团单」没带 `from` → 返回退到列表而非那张详情 → 已补。
- `components/nav` 的 `navigateBack` 手写了一份 `navigateBackOrTab` → 改呼共用的。

✅ 全站每个用 `sub-nav` 的页都已明确指定返回落点，`check-contract.js` 的 C3 规则会持续把关。

### 3.2 保存成功后 ✅ 已收敛（2026-08-26）

**口径**：统一 **300ms → `navigateBackOrTab(来源页)`**。

例外只有两类：① 客户下单成功走 `showModal` 让客户确认；② 团主申请提交后留在原页看状态（`tourGuides/edit` 申请模式）。

已改：`feedback`（800ms + `wx.navigateBack` 直呼）、`my/info-edit`（600ms）、商品表单页（0ms，提示根本看不到就跳走；该页已随商品库删档）、`groupOrder/add`（800ms，且写死团单列表 → 改回 `sourceUrl`）。

### 3.3 参数双名 ✅ 已收敛（2026-08-26）

**口径**：一个目标页一个参数名。详情类统一用 `id`；跨实体引用用 `<实体>Id`。

`groupOrder/detail`＝`id`｜`groupOrder/productList`＝`id`｜`customerOrders/index`＝`orderId`｜`customerOrders/edit`＝`groupOrderId`。

删掉的别名分支全站都查无呼叫端，且已确认云函数产生的分享路径与小程序码用的都是保留的那个名字。

⚠️ 剩一个单名死参数（不是双名，故未动，见 §4）：`groupOrder/productList` 的 `productId`。（`fromMessage` 随讯息页删档一起消失。）

### 3.4 `wx.*` 直呼（未走 `utils/navigation.js`）

- ✅ `pages/feedback/index.js` — 已改 `navigateBackOrTab`
- ✅ `components/nav/index.js` — 已改 `navigateBackOrTab`
- 保留（语义无可替代，且都有 fail 兜底）：
  - `pages/my/index.ts` 的 `wx.reLaunch('/pages/login/login?gate=1')`——gate 要清空页面栈
  - `sub-pages/groupOrder/productList/index.ts` 的 `wx.redirectTo`——非管理者深链进来要**替换**本页而非叠一层

白名单（不算违规）：`custom-tab-bar/index.js` 的 `wx.switchTab`、`wx.navigateTo`（仅 DEV 报Bug 入口）。

### 3.5 鉴权闸门覆盖不一致

- `requireLogin()`：✅ 两个业务 tab（`groupOrder`、`customerOrders`）都已补上（2026-08-26），未登录导登录页并带 `redirectTo` 回原页。（商品库 tab 已整个删除，见 `BUSINESS_LOGIC_PRINCIPLES` B2 #8。）
- `useAccessPage`：全站 19 页中 9 页有、10 页无；无的全部自写 `canUseFeature`。

---

## 4. 待拍板（❓）

| 项目 | 事实 | 建议 |
| --- | --- | --- |
| `groupOrder/productList` 的 `productId` | 单名死参数，全站无呼叫端，却牵着一整套 `pendingProductId`「进页自动开某商品详情」机制 | 要嘛补上入口，要嘛连机制一起删 |
| `setting` 的 url 跳转分支 | `onEleClick` 有 `url` 分支，但 `menuData` 无任何项带 `url` | 建议删死分支 |
| `providers/index` 无 featureKey | 用 `canUseProviderPortal` 而非 `canUseFeature` | 统一到 featureKey？ |
| `components/nav` 的两个出口不可达 | `searchTurn` 无 bind；`openDrawer` 只在 `navType==='search'` 渲染，全站无页面用此 navType | 建议删死码 |

---

## 5. 🚧 未实作的画面契约（目标态，不是现况）— `C-PROXY-ORDER`

> 本节写的是**还没做**的画面。开发项 `C-PROXY-ORDER`（`BUSINESS_LOGIC_PRINCIPLES.md` Part C · C5），
> 业务规则见同档 A6「代下单订单的归属」，栏位见 `FIELD_DICT.md` §5「待开发栏位——代客下单」。
> **代下单的订单不绑客户帐号、客户端看不到**（决策 14），所以本节只有团主端的画面。
> **做完后把本节内容并进上面 §1–§3，并删掉这一节。**

### 5.1 团主代客下单（决策 14）

**入口**：`sub-pages/groupOrder/detail` 团主管理区新增「代客下单」——只对**本团归属/被授权的团主**与管理层显示，客户视图不得出现。
放在既有的管理操作条内（该条已收敛成单行三小按钮，见 `进度总览.md` #E4），不另开入口，遵守 A12 一功能一固定位置。

**跳转**：`navigateByUrl('/pages/customerOrders/edit/index?groupOrderId=<团单id>&proxy=1')`
- `proxy=1` 是代下单模式旗标；**不带 `shareToken`**——团主代下单走团主权限，不是分享链接路径。
- 参数名沿用既有 `groupOrderId`（§3.3 参数单名规矩），新增的旗标只有 `proxy` 一个，不要再发明第二个名字。

**下单页在 `proxy=1` 时的差异**：

| 项目 | 客户自助（现况） | 🚧 团主代下单 |
| --- | --- | --- |
| 权限闸门 | 自写 `CUSTOMER_ORDER_CREATE` → `accessDenied` | （`C-PROXY-ORDER`）改判「是本团团主或管理层」；纯 `guide` 也要能进（现况会被挡） |
| 收单截止后 | 挡住，不能提交 | **仍可提交**（A6 团主例外） |
| 客户姓名/手机 | 预填自己的 profile，可改 | **必填、不预填**，这两栏就是「帮谁下的」依据 |
| 标题区 | 一般下单 | 明确标示「代客下单」，避免团主误以为在帮自己下 |
| 保存后 | `showModal` 确认 → `/pages/customerOrders/index` | 回 `detail?id=<团单>`（团主还在管这张团单，不该被丢去订单列表） |

**返回落点**：`detail?id=<团单>`；无 ID 时退 `/pages/groupOrder/index`（团主的列表，不是客户订单列表）。

### 5.2 代下单标记的显示位置（都是团主端）

同一笔订单会在多处渲染，**改一处就回报＝没查完**（这是本项目最大宗 BUG 来源，见 `FIELD_DICT.md` §5.6 已列 11 处）。
代下单订单**不出现在客户端**（决策 14），所以只有团主/管理层视角要处理：

| 位置 | 要显示什么 |
| --- | --- |
| `pages/customerOrders/index` 订单卡片 | 「代下单」标记 + 帮的客户姓名；**必须与团主自己下的单区分得开**（两者归属欄位都是团主） |
| `sub-pages/groupOrder/detail` 团主的订单明细列表 | 同卡片，标记一致 |
| 订单详情弹窗 | 代下单团主、填入的客户姓名/手机 |

**判定**：三处文案与标记必须同一份口径（沿用 `FIELD_DICT.md` §5.5 已知的「状态文案 4 份独立 map」教训，不要再各写一份）。

# PAGE_MAP — 页面跳转契约

> **这份是什么**：全站 26 个页面的「谁能进 / 从哪进 / 带什么参数 / 出去哪 / 返回落在哪」的**唯一口径**。
> **怎么用**：动任何页面跳转前先查这份。
> **和别的文件的分工**：`BUSINESS_LOGIC_PRINCIPLES.md` 定「业务上应该长怎样」（A12 入口编排、A13 鉴权闸门）；这份定「代码层面具体跳去哪」。欄位口径查 `FIELD_DICT.md`。
>
> **状态**：2026-08-25 全站扫描后建立。标 ⚠️ 的是**现况有问题、待收敛**，标 ❓ 的是**待拍板**。收敛完成后把标记拿掉。

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

### 1.1 Tab 页（5 个）

| 页面 | 接受参数 | 权限闸门 | 返回键 | 出去哪 |
| --- | --- | --- | --- | --- |
| `pages/groupOrder/index` | 无 | `useAccessPage` + `requireLogin` + `GROUP_ORDERS` | 无（tab 页） | `groupOrder/add?copyFrom=&from=`<br>`groupOrder/add?from=`<br>`groupOrder/detail?id=`<br>`login?redirectTo=` |
| `pages/customerOrders/index` | `orderId`<br>`status` | `useAccessPage` + `requireLogin` + `CUSTOMER_ORDERS` | 无 | `customerOrders/edit?groupOrderId=`<br>`login?redirectTo=` |
| `pages/productManagement/index` | 无 | `useAccessPage` + `PRODUCTS` / `PRODUCT_MANAGE`<br>❓ 无 `requireLogin`：刻意支援未登录浏览公开商品，待拍板（§4） | 无 | `product/add`（新增）<br>`product/add?id=`（编辑）<br>`product/list`<br>`providers/index`<br>`login?redirectTo=` |
| `pages/userReview/index` | 无 | `useAccessPage` + `requireLogin`<br>自写 `isOwnerOrAdmin` | 无 | 无 |
| `pages/my/index` | 无 | 自写（`onShow` 未登录 → `login?gate=1`） | 无 | `login?gate=1` ⚠️ `wx.reLaunch` 直呼<br>`login?redirectTo=`<br>`search?from=`<br>`dataCenter` / `setting` / `tourGuides` / `operationLogs`<br>`tourGuides/edit`（申请团主，不带 id） |

> ⚠️ **`consumeTabRouteQuery` 只有 `customerOrders` 会读**。`navigateByUrl` 对其余 4 个 tab 记下的 query（`utils/navigation.js:44` `rememberTabRouteQuery`）会永久残留在 storage。

### 1.2 团单与商品（sub-pages，6 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 保存成功后 |
| --- | --- | --- | --- | --- |
| `sub-pages/groupOrder/detail/index` | `id`<br>`readonly=1` | 无 `useAccessPage`<br>靠后端回传 `canManageGroupOrder` 分流 | ✅ `/pages/groupOrder/index` | — |
| `sub-pages/groupOrder/productList/index` | `id`<br>❓ 另接受 `productId`（无来源，见 §4） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ✅ 动态 `detail?id=<团单>`，无 ID 退团单列表 | — |
| `sub-pages/groupOrder/add/index` | `from`（来源页）<br>`id`（编辑）<br>`copyFrom`（复制） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ✅ `custom-back` + `bind:back`，fallback = `sourceUrl` | ✅ 300ms → `navigateBackOrTab(sourceUrl)` |
| `sub-pages/groupOrder/product-picker/index` | `from`<br>`excludeIds`（JSON） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ⚠️ 写了 `onBack` 但 wxml 没绑 → 实际走 sub-nav 预设 | 回 `sourceUrl` |
| `sub-pages/product/add/index` | `id`（编辑） | `useAccessPage` + `requireLogin` + `PRODUCT_MANAGE` | ✅ `/pages/productManagement/index` | ✅ 300ms → `/pages/productManagement/index`<br>另 emit `refreshList` 给开启方 |
| `sub-pages/product/list/index` | `productId` | 无 `useAccessPage`<br>自写 `canUseBusiness` 决定走 `listVisible` / `listPublic` | ✅ `/pages/productManagement/index` | — |

### 1.3 目录与编辑页（8 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 保存成功后 |
| --- | --- | --- | --- | --- |
| `pages/tourGuides/index` | 无 | `useAccessPage` + `requireLogin` + `TOUR_GUIDES` | `nav navType=my` → `navigateBackOrTab('/pages/my/index')` | — |
| `pages/tourGuides/edit/index` | `id`（缺省用 `profile.id`） | 自写 `canUseFeature` + `isOwnerOrAdmin` + `hasRole(GUIDE)` | ✅ `/pages/my/index` | 300ms → `/pages/my/index`<br>申请模式原地不跳，重跑 `initPage({})` |
| `pages/providers/index` | 无 | `useAccessPage` + `requireLogin` + `canUseProviderPortal`<br>❓ 无 featureKey | 无返回键 | — |
| `pages/providers/edit/index` | `id` | 自写 `canUseProviderPortal` | ✅ `/pages/providers/index` | 300ms → `/pages/providers/index` |
| `pages/customerOrders/edit/index` | `groupOrderId`<br>`shareToken`<br>`scene`（扫码） | 自写 `CUSTOMER_ORDER_CREATE` → `accessDenied` | ✅ 动态 `detail?id=<团单>`，无 ID 退客户订单列表 | `showModal` 确认 →`/pages/customerOrders/index` |
| `pages/profile/index` | 无 | `useAccessPage` + `requireLogin` + `PROFILE` | `nav navType=my` | — |
| `pages/profile/edit/index` | `id`（缺省用 `profile.id`） | 自写 `PROFILE` + `isOwnerOrAdmin \|\| 本人` | ⚠️ `onBack` 想去 `/pages/my/index`，**没绑** → 实际 `/pages/groupOrder/index` | 300ms → `/pages/my/index` |
| `pages/my/info-edit/index` | 无 | 自写 `INFO_EDIT` | ✅ `/pages/my/index` | ✅ 300ms → `/pages/my/index` |

### 1.4 其余（7 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 出去哪 |
| --- | --- | --- | --- | --- |
| `pages/login/login` | `redirectTo`<br>`gate=1`<br>`tester` | 无 | ✅ sub-nav `fallback-url="/pages/my/index"`，`gate` 时隐藏返回键 | 登录后 `redirectByUrl(redirectTo)`，fallback `/pages/my/index` |
| `pages/search/index` | `from` | 自写 `SEARCH` | ✅ `custom-back` + `bind:back`，fallback = `sourceUrl \|\| /pages/my/index` | `groupOrder/detail?id=`<br>`customerOrders?orderId=`<br>`product/list?productId=` |
| `pages/operationLogs/index` | 无 | `useAccessPage` + `requireLogin` + `OPERATION_LOGS` | ✅ sub-nav `fallback-url="/pages/my/index"` | 无 |
| `pages/dataCenter/index` | 无（只有 `onShow`，无 `onLoad`） | `useAccessPage` + `requireLogin` + `DATA_CENTER` | ✅ sub-nav `fallback-url="/pages/my/index"` | 无 |
| `pages/setting/index` | 无 | 自写 `INFO_EDIT` | ✅ sub-nav `fallback-url="/pages/my/index"` | `login?redirectTo=`<br>❓ `onEleClick` 有 url 跳转分支，但 `menuData` 无任何项带 `url` |
| `pages/message/index` | 无 | `useAccessPage` + `requireLogin` + `MESSAGE` | ⚠️ sub-nav 预设（未指定） | `customerOrders`（空态 CTA）<br>`customerOrders?orderId=&fromMessage=1`<br>⚠️ `fromMessage` 目的地从不读取 |
| `pages/feedback/index` | 无 | 只有 `config.isDev` 判断 | ✅ `/pages/my/index` | ✅ 300ms → `navigateBackOrTab('/pages/my/index')` |

---

## 2. 进入来源反查

| 目标页 | 谁会跳进来 |
| --- | --- |
| `groupOrder/detail` | `groupOrder/index`（`?id=`）、`search`（`?id=`）、`groupOrder/productList`（⚠️ `wx.redirectTo` 直呼） |
| `groupOrder/add` | `groupOrder/index`（`?copyFrom=&from=` / `?from=`）、`groupOrder/detail`（`?id=&from=detail`） |
| `groupOrder/productList` | `groupOrder/detail` |
| `groupOrder/product-picker` | ❓ 唯一呼叫点 `groupOrder/add` 的 `onSelectGoods`，但 wxml **没有任何 bind** → UI 不可达 |
| `product/add` | `productManagement`（新增 / `?id=` 编辑） |
| `product/list` | `productManagement`、`search`（`?productId=`） |
| `customerOrders/index` | tab、`message`（`?orderId=&fromMessage=1`）、`search`（`?orderId=`）、`customerOrders/edit` |
| `customerOrders/edit` | `customerOrders/index`（`?groupOrderId=`）、`groupOrder/detail` 的分享 / 小程序码（`?groupOrderId=&shareToken=`）、扫码 `scene` |
| `providers/index` | `productManagement` |
| `providers/edit` | `providers/index` |
| `tourGuides/index` | `my` |
| `tourGuides/edit` | `my`（⚠️ 不带 id）、`tourGuides/index`（带或不带 id） |
| `profile/edit` | `profile/index`（而 `profile/index` 本身已无入口 → 本页实际不可达） |
| `login` | `useAccessPage.requireLogin`（自动带 `redirectTo`）、`my`（`?gate=1`）、`groupOrder`、`customerOrders`、`productManagement`、`setting`、`my/info-edit`、`customerOrders/edit` |
| `search` / `dataCenter` / `setting` / `operationLogs` | `my` |
| `feedback` | `custom-tab-bar`（⚠️ `wx.navigateTo` 直呼，仅 `isDev` 注入） |
| **无任何入口** | ❓ `pages/message`、`pages/profile`（连带 `profile/edit`）、`pages/my/info-edit` |

---

## 3. 现况问题清单（待收敛）

### 3.1 返回键 ✅ 已收敛（2026-08-26）

**口径**：每个用 `sub-nav` 的页面都必须在 wxml 明确写 `fallback-url`，值取第 2 节的主要来源页；来源随参数变动的用动态值。写了 `onBack` 就必须绑，否则删掉。

| 页面 | 返回落点 |
| --- | --- |
| `feedback`、`my/info-edit`、`tourGuides/edit`、`dataCenter`、`operationLogs`、`setting`、`login` | `/pages/my/index` |
| `providers/edit` | `/pages/providers/index` |
| `product/add`、`product/list` | `/pages/productManagement/index` |
| `groupOrder/detail` | `/pages/groupOrder/index` |
| `groupOrder/productList` | 动态 `detail?id=<团单>`，无 ID 退 `/pages/groupOrder/index` |
| `customerOrders/edit` | 动态 `detail?id=<团单>`，无 ID 退 `/pages/customerOrders/index` |
| `groupOrder/add` | 动态 `sourceUrl`（`?from=`），`custom-back` + `bind:back` |
| `search` | 动态 `sourceUrl`，`custom-back` + `bind:back` |

顺带修掉的：

- `providers/edit`、`tourGuides/edit`、`customerOrders/edit` 三个 `onBack` 从未绑到 wxml（死码），且第三个落点还是错的 → 改用 `fallback-url` 后与之等价，已删。
- `product/list` 挂的 `<nav>` 全站都没注册 → 整条导航列不渲染、根本没有返回键 → 换成 `sub-nav` 并在 `index.json` 注册。
- `groupOrder/detail` 进「编辑团单」没带 `from` → 返回退到列表而非那张详情 → 已补。
- `components/nav` 的 `navigateBack` 手写了一份 `navigateBackOrTab` → 改呼共用的。

⚠️ 仍未指定的三页：`message`、`profile/edit`、`groupOrder/product-picker`——都在第三批的删除名单里，故不补。

### 3.2 保存成功后 ✅ 已收敛（2026-08-26）

**口径**：统一 **300ms → `navigateBackOrTab(来源页)`**。

例外只有两类：① 客户下单成功走 `showModal` 让客户确认；② 团主申请提交后留在原页看状态（`tourGuides/edit` 申请模式）。

已改：`feedback`（800ms + `wx.navigateBack` 直呼）、`my/info-edit`（600ms）、`product/add`（0ms，提示根本看不到就跳走）、`groupOrder/add`（800ms，且写死团单列表 → 改回 `sourceUrl`）。

### 3.3 参数双名 ✅ 已收敛（2026-08-26）

**口径**：一个目标页一个参数名。详情类统一用 `id`；跨实体引用用 `<实体>Id`。

`groupOrder/detail`＝`id`｜`groupOrder/productList`＝`id`｜`customerOrders/index`＝`orderId`｜`customerOrders/edit`＝`groupOrderId`｜`product/list`＝`productId`。

删掉的别名分支全站都查无呼叫端，且已确认云函数产生的分享路径与小程序码用的都是保留的那个名字。

⚠️ 剩两个单名死参数（不是双名，故未动，见 §4）：`groupOrder/productList` 的 `productId`、`customerOrders/index` 的 `fromMessage`。

### 3.4 `wx.*` 直呼（未走 `utils/navigation.js`）

- ✅ `pages/feedback/index.js` — 已改 `navigateBackOrTab`
- ✅ `components/nav/index.js` — 已改 `navigateBackOrTab`
- 保留（语义无可替代，且都有 fail 兜底）：
  - `pages/my/index.ts` 的 `wx.reLaunch('/pages/login/login?gate=1')`——gate 要清空页面栈
  - `sub-pages/groupOrder/productList/index.ts` 的 `wx.redirectTo`——非管理者深链进来要**替换**本页而非叠一层

白名单（不算违规）：`custom-tab-bar/index.js` 的 `wx.switchTab`、`wx.navigateTo`（仅 DEV 报Bug 入口）。

### 3.5 鉴权闸门覆盖不一致

- `requireLogin()`：✅ `groupOrder`、`customerOrders` 两个主 tab 已补上（2026-08-26），未登录导登录页并带 `redirectTo` 回原页。`productManagement` 仍无——该页刻意支援未登录浏览公开商品，待 OWNER 拍板（见 §4）。
- `useAccessPage`：14 页有、12 页无；无的全部自写 `canUseFeature`。

---

## 4. 待拍板（❓）

| 项目 | 事实 | 建议 |
| --- | --- | --- |
| `productManagement` 要不要也加 `requireLogin` | 决策 7 说三个主 tab 一律导登录页，但本页刻意让未登录访客浏览公开商品（`canShowProductCatalog` + `listPublic`）。加闸门＝删掉这个功能 | 产品取舍，待 OWNER |
| `groupOrder/productList` 的 `productId` | 单名死参数，全站无呼叫端，却牵着一整套 `pendingProductId`「进页自动开某商品详情」机制 | 要嘛补上入口，要嘛连机制一起删 |
| `customerOrders/index` 的 `fromMessage` | 由 `message` 页传出，目的地从不读取 | `message` 页在第三批删除名单里，随它一起消失 |
| 无入口页 | `pages/message`、`pages/profile`（连带 `profile/edit` 不可达）、`pages/my/info-edit` | 留或删 |
| `product-picker` UI 不可达 | 开团页已改内嵌新增商品（`add/index.wxml:77` 的 `#8` 注释），picker 是被取代的旧设计；但 `C-PRODUCT-LIB-SAVE` 立项未结 | 该立项还做不做 |
| `productManagement` tab | `custom-tab-bar/index.js:70` 永久过滤，但 `app.json` 与 `config.js` 仍保留该项 | 建议清掉配置残留 |
| `setting` 的 url 跳转分支 | `onEleClick` 有 `url` 分支，但 `menuData` 无任何项带 `url` | 建议删死分支 |
| `providers/index` 无 featureKey | 用 `canUseProviderPortal` 而非 `canUseFeature` | 统一到 featureKey？ |
| `components/nav` 的两个出口不可达 | `searchTurn` 无 bind；`openDrawer` 只在 `navType==='search'` 渲染，全站无页面用此 navType | 建议删死码 |

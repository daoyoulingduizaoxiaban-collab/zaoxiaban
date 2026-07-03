# ROLE_FEATURE_ACCESS_MATRIX

## 文件用途
本文件只保留角色入口验收的最小原则，避免形成第二套权限规则。

稳定业务逻辑以 `BUSINESS_LOGIC_PRINCIPLES.md` 为准；MVP gate 以 `MVP_COMPLETION_CHECKLIST.md` 为准；实际程式权限以 `services/auth/roleScope.js`、service/repository、cloud function guard 为准。

## 核心原则
- `guide` 是内部 role key，正式用户界面显示为「团主」。
- 前端隐藏入口只改善体验，不能替代 service/repository/cloud function 权限检查。
- 正式用户不得看到 QA、mock、Seed、MVP、未完成、后续、OpenID 未验证等内部文案。
- 未登录、待审核、拒绝、停用、过期或无权角色不能看到完整业务入口。
- 一个 OpenID 可以有多个角色；页面入口和后端权限必须按当前场景与有效身份判断。
- 直达 route、分享路径、扫码、历史页面、fallback 导航都必须进入安全状态，不得绕过权限。

## 验收方式
角色入口验收只记录 gate 级结论，不在本文件维护逐页矩阵。

QA 或 AGENT 验收时应覆盖：

- 未登录/游客。
- `pending_review`、`rejected`、`disabled`、过期账号。
- 团主（内部 role key `guide`）。
- `customer`。
- `provider`。
- `admin`。
- `owner`。
- 多角色账号和场景化入口。

每个角色至少检查：

- 登录后首屏。
- tab/custom tab bar。
- 首页快捷入口。
- My 服务列表。
- 核心列表页与详情页。
- 空状态 CTA。
- 分享/扫码入口。
- 直达 route 与返回 fallback。
- 后端拒绝无权读写。

具体不通过项只写入 `QA/QA_BUG_REPORT_202607021815.md`；本文件不维护逐页 row。

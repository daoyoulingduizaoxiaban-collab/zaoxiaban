# ACCEPTANCE

## 文件用途
本文件只记录当前产品能否宣告通过验收。它不是业务逻辑来源、不是 MVP backlog、不是 BUG 单，也不维护逐页或逐角色细项清单。

业务原则以 `BUSINESS_LOGIC_PRINCIPLES.md` 为准；MVP gate 与剩余需求以 `MVP_COMPLETION_CHECKLIST.md` 为准；当前不通过的具体 GUI/BUG row 只看 `QA/QA_BUG_REPORT_202607021815.md`。

## 当前结论
当前项目还不能宣告真人可用 MVP 上线。

主要原因：

- 完整 29-route GUI smoke test 尚未完成。
- 真实 workflow smoke 尚未完成。
- GUI layout/style 稳定性尚未完成全画面验证。
- 图片上传、付款凭证、付款闭环仍缺 fresh DevTools 或真机证据。
- 正式 OpenID 下的角色审核、权限刷新、过期/停用/拒绝状态与后端拒绝仍需 fresh GUI/云端 readback 验证。

## 已有验证信号
- `authLogin` 已接入微信云登录，并曾验证可初始化正式 OpenID 的云端 `users` profile。
- `businessData` 云函数已接入核心业务资料路径。
- 商品、团单、客户订单、付款状态历史已有 service/repository 边界。
- 商品、团单、客户订单的云端保存曾通过 targeted automation 验证。
- 既有静态检查曾通过：`npm run lint`、`git diff --check`。

这些信号只能证明对应范围已有基础实现或局部验证，不能替代完整 GUI/真机验收。

## 未验收项目
- 全量 route GUI smoke。
- 真实 workflow smoke：tab、带 id 详情、eventChannel picker、客户分享入口、列表卡片、空状态 CTA、返回 fallback。
- GUI layout/style 稳定性。
- 真实图片上传与重开显示。
- 付款凭证选填、有凭证/无凭证两条付款路径。
- 团主确认收款与付款历史 GUI 操作。
- customer 分享受限下单与多角色场景切换。
- provider 供应商完整申请、审核、资料维护、商品管理、团主选品、客户可见流程。
- owner/admin 用户审核、角色多选、角色期限、过期账号不可用状态。
- owner 运营验收角色预览模式。
- 正式云端权限拒绝 readback。

## 验收规则
只有具备匹配验证信号的项目才能宣告完成。

- 静态检查可以支持代码形状判断，但不能证明 GUI、真 OpenID、云端持久化或真实用户流程通过。
- 旧截图、旧日志、局部 targeted automation 不能关闭新的 GUI/MVP gate。
- 不通过的具体 BUG row 回到 `QA/QA_BUG_REPORT_202607021815.md` 维护；本文件不复制 BUG 清单。

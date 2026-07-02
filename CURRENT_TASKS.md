# CURRENT_TASKS

## 文件职责
`CURRENT_TASKS.md` 只回答「下一位 agent 现在该做什么」。不要在这里维护总 MVP backlog。

- 完整 MVP checklist、半成品、未做项：看 `MVP_COMPLETION_CHECKLIST.md`。
- 验收结果与未验证项：看 `ACCEPTANCE.md`。
- 当前事实与接手注意：看 `HANDOFF.md`。
- 资料层建议与模型：看 `DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`。

## 当前任务
Phase 3 与 Phase 6 的 local/QA 范围已完成。使用者已确认 MVP 正式资料层优先采用微信云开发数据库 + 云函数。当前已完成 Phase 8 的正式登录/OpenID 与核心业务资料云端化：`authLogin`、`businessData` 云函数已部署，DevTools automation targeted flow 验证商品、团单、客户订单、收款状态与状态历史都走 cloud repository。

当前未完成缺口是 Phase 7 GUI 逐 route 互动 smoke test。owner/admin 正式角色白名单仍需后续配置，但不阻塞 guide/customer MVP 主流程。

下一位 agent 只能先做以下接手动作：

1. 读取 `CURRENT_TASKS.md`、`PROJECT_RULES.md`、`MVP_COMPLETION_CHECKLIST.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`、`QA/QA_SEED_REQUIREMENTS.md`。
2. 执行 `git status --short --branch`，确认是否有非本轮改动。
3. 对照 `MVP_COMPLETION_CHECKLIST.md`，确认使用者指定的范围属于哪一个 Phase。
4. 若使用者要求继续 MVP，优先处理 `MVP_COMPLETION_CHECKLIST.md` 的 Phase 7 未勾 GUI smoke test。

## 当前约束
- 项目仍是混合模式：正式微信云登录与核心业务云端保存已接通；mock 身份仍保留 QA/local fallback。
- 正式资料层方向已确认：微信云开发数据库 + 云函数，且必须隐藏在 service/repository 边界后。
- 微信云环境：`cloud1-3gwlqssy1f1972a9`。
- 正式 OpenID 已通过 `authLogin` 验证；正式业务云端保存已通过 targeted automation 验证。
- Phase 3 导游团单新增/编辑与本团商品加入/移除保存闭环已在 cloud repository 与 local/QA fallback 模式完成。
- Phase 4 商品库已有 cloud repository 与 local/QA fallback。
- Phase 5 客户下单与收款闭环已有 cloud repository 与 local/QA fallback。
- 微信 DevTools CLI 可打开项目，`auto-replay --replay-all` 可完成；automation 已可用于 targeted login 验证，但不能宣称 27-route GUI 通过。
- Phase 8 的团单、商品、客户订单、收款云集合与云函数权限边界已实现；数据库控制台安全规则未单独通过 CLI 配置，页面不会直接访问数据库。

## 禁止事项
- 不要自行启动、重开、refocus 或 preview 微信 DevTools。
- 不要使用 `automator.launch(...)`。
- 不要推送远端、部署、创建云资源、删除正式资料、安装新套件或使用网络，除非使用者明确要求；本轮使用者已授权 `authLogin` 云函数建立与部署。
- 不要提交 `resume/preview-info.json`、`resume/preview-qr.png`。
- 不要把 mock/local/QA fallback 写成正式 OpenID、正式云端保存或真人可用闭环。

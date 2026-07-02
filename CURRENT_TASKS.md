# CURRENT_TASKS

## 文件职责
`CURRENT_TASKS.md` 只回答「下一位 agent 现在该做什么」。不要在这里维护总 MVP backlog。

- 新对话短入口：先看 `NEXT_AGENT_TASK.md`。
- 完整 MVP checklist、半成品、未做项：看 `MVP_COMPLETION_CHECKLIST.md`。
- 验收结果与未验证项：看 `ACCEPTANCE.md`。
- 当前事实与接手注意：看 `HANDOFF.md`。
- 资料层建议与模型：看 `DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`。

## 当前任务
Phase 3 与 Phase 6 的 local/QA 范围已完成。使用者已确认 MVP 正式资料层优先采用微信云开发数据库 + 云函数。当前已完成 Phase 8 的正式登录/OpenID 与核心业务资料云端化：`authLogin`、`businessData` 云函数已部署，DevTools automation targeted flow 验证商品、团单、客户订单、收款状态与状态历史都走 cloud repository。

当前未完成缺口是 Phase 7 GUI 逐 route 互动 smoke test。`QA/QA_BUG_REPORT_202607021815.md` 的复测 GUI 残留已做追加回修；资料中心又补了原生 `index.wxss`，还需要重新截图/操作验证。owner/admin 正式角色白名单仍需后续配置，但不阻塞 guide/customer MVP 主流程。

2026-07-02 QA planning update:
- 新的 QA 细测计划已建立：`QA/QA_DETAILED_RETEST_PLAN_20260702.md`。
- 下一轮 QA 结果不要覆盖旧问题单，先整理到新表格：`QA/QA_DETAILED_RETEST_RESULTS_20260702.md`，再把最终结论同步回 `QA/QA_BUG_REPORT_202607021815.md`、`ACCEPTANCE.md`、`MVP_COMPLETION_CHECKLIST.md`、`HANDOFF.md`。
- DevTools automation 优先连接既有 session；若确实连不上或 session 卡死，可以重启 DevTools，但必须记录重启原因，避免频繁无意义重启。
- 商品图片「真图片」指通过小程序 `wx.chooseMedia` 实际选择的本地/相册图片，不是 seed 假 URL 或程式硬塞 URL。若 DevTools 无法稳定操作 picker，QA 应标记为需要真机补验。
- 使用者同意 customer ID 可先用 QA/mock 假身份验证；建议开发 agent 如需支援自动化，可新增 QA-only 身份切换开关，例如 `qaRoleOverride` / `qaOpenIdOverride`，且只能在 `isMock: true` 或明确 QA 模式生效，不能影响正式 OpenID 权限。
- QA-only 身份切换开关应明确覆盖当前系统会出现的角色集合：`guide`、`customer`、`owner`、`admin`、`provider`。其中 `guide` / `customer` 是本轮 MVP gate 必测角色；`owner` / `admin` / `provider` 只用于确认受限、只读、未开放或白名单边界提示，不代表正式后台能力已开放。
- QA 判定必须区分：`QA/mock role isolation passed` 不等于 `formal OpenID isolation passed`。

2026-07-02 detailed retest attempt:
- 结果表已开始填写：`QA/QA_DETAILED_RETEST_RESULTS_20260702.md`。
- 已确认本轮开始前 dirty files：`CURRENT_TASKS.md`、`HANDOFF.md`、`QA/QA_DETAILED_RETEST_RESULTS_20260702.md`。
- 既有 WeChat DevTools process 存在；本轮未重启、未 preview、未部署、未使用 `automator.launch(...)`。
- `miniprogram-automator.connect` 连接 `9420`、`19512`、`3799` 失败；DevTools CLI `auto --port 13521 --auto-port 9420` 可完成，但后续仍无法连接 `9420`、`13521` 或本机侦测到的 WeChat/DevTools listening ports。
- 因没有新的 DevTools/device GUI evidence，Phase 7 real workflow smoke 仍未通过；不能宣告 Phase 8 真人可用 MVP gate。

下一位 agent 只能先做以下接手动作：

1. 读取 `CURRENT_TASKS.md`、`PROJECT_RULES.md`、`MVP_COMPLETION_CHECKLIST.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`、`QA/QA_SEED_REQUIREMENTS.md`。
2. 执行 `git status --short --branch`，确认是否有非本轮改动。
3. 对照 `MVP_COMPLETION_CHECKLIST.md`，确认使用者指定的范围属于哪一个 Phase。
4. 若使用者要求继续 MVP，优先取得可用的 DevTools automation websocket/ticket/session，或安排人工/真机 real workflow smoke；再重跑 `MVP_COMPLETION_CHECKLIST.md` 的 Phase 7 GUI smoke test，并优先确认 QA bug report 中 GUI-004/GUI-006、BUG-002/006/008/009。
5. 若先有开发 agent 处理 QA 身份切换辅助，只允许做 QA/mock 模式开关；角色选项需覆盖 `guide`、`customer`、`owner`、`admin`、`provider`，但不要把假 OpenID 包装成正式微信身份，也不要扩展 owner/admin/provider 后台能力。

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
- 下一轮 QA 报告输出位置：`QA/QA_DETAILED_RETEST_RESULTS_20260702.md`。

## 禁止事项
- 不要无故自行启动、重开、refocus 或 preview 微信 DevTools；若 automation 连不上或 session 卡死，允许重启，但必须记录原因。
- 不要使用 `automator.launch(...)`。
- 不要推送远端、部署、创建云资源、删除正式资料、安装新套件或使用网络，除非使用者明确要求；本轮使用者已授权 `authLogin` 云函数建立与部署。
- 不要提交 `resume/preview-info.json`、`resume/preview-qr.png`。
- 不要把 mock/local/QA fallback 写成正式 OpenID、正式云端保存或真人可用闭环。

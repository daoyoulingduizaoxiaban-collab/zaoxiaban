# CURRENT_TASKS

## 文件职责
`CURRENT_TASKS.md` 只回答「下一位 agent 现在该做什么」。不要在这里维护总 MVP backlog。

- 完整 MVP checklist、半成品、未做项：看 `MVP_COMPLETION_CHECKLIST.md`。
- 验收结果与未验证项：看 `ACCEPTANCE.md`。
- 当前事实与接手注意：看 `HANDOFF.md`。
- 资料层建议与模型：看 `DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`。

## 当前任务
当前没有正在进行中的开发任务。

下一位 agent 只能先做以下接手动作：

1. 读取 `CURRENT_TASKS.md`、`PROJECT_RULES.md`、`MVP_COMPLETION_CHECKLIST.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`、`QA_SEED_REQUIREMENTS.md`。
2. 执行 `git status --short --branch`，确认是否有非本轮改动。
3. 对照 `MVP_COMPLETION_CHECKLIST.md`，确认使用者指定的范围属于哪一个 Phase。
4. 等待使用者明确指定下一轮范围；不要自行从 checklist 中挑一个开做。

## 当前约束
- 项目仍是 QA/local mode，不是 production。
- 正式资料层未确认，正式 OpenID 未验证，正式云端保存未实现。
- Phase 4 商品库只有 local/QA repository 版本。
- Phase 5 客户下单与收款闭环未实现，除非使用者明确指定，否则不要开始。
- 微信 DevTools GUI smoke test 尚未执行，不能宣称 GUI 通过。

## 禁止事项
- 不要自行启动、重开、refocus 或 preview 微信 DevTools。
- 不要使用 `automator.launch(...)`。
- 不要推送远端、部署、创建云资源、删除正式资料、安装新套件或使用网络，除非使用者明确要求。
- 不要提交 `resume/preview-info.json`、`resume/preview-qr.png`。
- 不要把 mock/local/QA fallback 写成正式 OpenID、正式云端保存或真人可用闭环。

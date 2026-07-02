# NEXT_AGENT_TASK

Last updated: 2026-07-02

## Startup

- Canonical path: `/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- Current branch observed: `codex`
- Dirty status expected: dirty. Existing QA bug report, QA screenshots, and `pages/dataCenter` edits were present before this entry file was created.
- Read first: `/Users/admin/Desktop/CODEX_WORKFLOW.md`, `/Users/admin/Desktop/TOOL_CAPABILITY_CHECKLIST.md`, `CURRENT_TASKS.md`, `PROJECT_RULES.md`, `MVP_COMPLETION_CHECKLIST.md`, `ACCEPTANCE.md`, `HANDOFF.md`, `DATA_LAYER_DECISION.md`, `DATA_MODEL_AND_PERMISSIONS.md`, `QA/QA_SEED_REQUIREMENTS.md`.
- Do not touch: `resume/preview-info.json`, `resume/preview-qr.png`, production data, unrelated QA screenshots, or pre-existing dirty files unless the current task explicitly requires them.

## Current Single Goal

The next high-value gap is Phase 7 full GUI route smoke and bug retest evidence. Before doing new feature work, confirm the current dirty state and read `QA/QA_BUG_REPORT_202607021815.md`.

Do not expand scope to new cloud functions, deployment, new phases, or admin tooling unless the user explicitly asks.

## Acceptance Checklist

- [ ] `git status --short --branch` run and pre-existing dirty files identified.
- [ ] `QA/QA_BUG_REPORT_202607021815.md` read before GUI retest work.
- [ ] Phase 7 / 27-route smoke result recorded in `ACCEPTANCE.md` and `MVP_COMPLETION_CHECKLIST.md` as appropriate.
- [ ] `CURRENT_TASKS.md` and `HANDOFF.md` updated after the run.
- [ ] Unverified routes or GUI-only blockers listed explicitly.

## Validation

Required baseline checks:

```bash
git status --short --branch
npm run lint
git diff --check
```

GUI validation can only be claimed after actual WeChat DevTools or device evidence.

## Done Definition

Done = target dirty state understood + requested fixes/tests performed + required checks run + checklist/acceptance/handoff updated + unverified GUI items reported.

## Completion Report

1. completed checklist items
2. changed files
3. validation run
4. unverified items and reasons
5. next step
6. commit hash, if any

# QA Tool Capability Checklist

Last updated: 2026-07-06

This project checklist is for Codex, Claude, and any other AI agent doing QA or GUI validation for the DaoYouLingDuiZaoXiaBan mini program.

## Canonical Project Path

Use this project path:

`/Users/admin/WeChatProjects/DaoYouLingDuiZaoXiaBan`

## Required Read Order For QA

Before QA work, read:

1. `/Users/admin/Desktop/AI_WORKFLOW.md`
2. `/Users/admin/WeChatProjects/DaoYouLingDuiZaoXiaBan/QA_TOOL_CAPABILITY_CHECKLIST.md`
3. `DOC/PROJECT_RULES.md`
4. `DOC/BUSINESS_LOGIC_PRINCIPLES.md`
5. `DOC/MVP_COMPLETION_CHECKLIST.md`
6. `DOC/ACCEPTANCE.md`
7. The active QA bug report named by the user.

## QA Bug Outcomes

For each QA bug row under test, use exactly one outcome:

- `通過`: The behavior was verified through the required UI or workflow. Remove the row from the current not-pass list, or update it according to the existing file convention.
- `不通過`: The behavior was tested and still has a concrete product problem. Keep the row and write the specific fixable issue.

The agent does not create custom status labels. Chat summaries must match the bug report outcome.

## WeChat DevTools GUI Testing

For GUI bug verification, operate the WeChat DevTools simulator screen like a real user:

- click tabs, buttons, cards, dialogs, and navigation controls
- enter form values where the workflow requires input
- use visible page state to judge the result
- capture screenshots, recordings, or precise visible-state notes as evidence

The following are supporting checks only:

- CLI command output
- HTTP/API response
- route existence
- source code inspection
- automation service connection state

Supporting checks can help diagnose a problem, but they do not replace GUI operation when the bug requires GUI proof.

## WeChat DevTools Window Discipline

Use the existing correct WeChat DevTools window when it is already open.

If no correct window exists, open WeChat DevTools at most once for the task and point it at:

`/Users/admin/WeChatProjects/DaoYouLingDuiZaoXiaBan`

After opening:

- keep the same window for the task
- do not repeatedly open, close, relaunch, or refocus DevTools
- if the wrong project is visible, record what is visible and correct the project path deliberately
- leave DevTools open at the end unless the user asks to close it

## Automation

Automation means real operation of the GUI or device through a controllable surface. A valid GUI automation attempt should operate the simulator or device screen and produce visible evidence.

Acceptable automation outputs:

- a replayable GUI script
- a deterministic sequence of clicks/inputs with screen references
- screenshots or recordings tied to each tested bug
- exact reproduction steps that another agent can replay

If a DevTools automation API path fails, switch to another GUI-control method instead of stopping at the API layer. A missing prebuilt script is not a reason to stop QA.

## File And Git Scope For QA

Before QA:

```bash
git status --short --branch
```

During QA:

- do not modify product code
- do not deploy
- do not operate cloud resources
- do not stage unrelated files
- update only the active QA bug report and evidence/script files that belong to the task

After QA:

```bash
git status --short --branch
git diff -- <active QA bug report path>
```

If the user requested a commit, stage only QA report and task evidence/script files.

## Completion Report For QA

Report:

- practical conclusion first
- tested bug range
- outcome for each bug: `通過` or `不通過`
- GUI evidence or reproducible operation steps for each bug
- files changed
- validation commands run
- commit hash, if committed
- any user action required

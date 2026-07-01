# Project Rules

## WeChat DevTools Testing Policy

- Do not repeatedly reopen, refocus, or reinitialize WeChat DevTools while the user is working.
- Treat `cli open --project ...`, `automator.launch(...)`, and repeated `cli preview ...` as disruptive because they can steal macOS focus and move the user's typing cursor.
- Default to the already-open WeChat DevTools window and the service port shown by the user. As of 2026-07-02, the known service port is `45512`.
- Prefer connecting to an existing automation websocket with `automator.connect(...)` over launching DevTools from the SDK.
- Run `cli auto --port 45512 --auto-port <fixed-port> --trust-project` only when automation is needed and the existing DevTools window is already open.
- If `automator.connect(...)` hangs or cannot connect, stop the GUI automation attempt and report the blocker. Do not escalate by repeatedly running `cli open`, `automator.launch(...)`, or `preview` unless the user explicitly approves.
- Only reopen or re-run `cli open` when it is genuinely required: the existing DevTools process is closed, the service port is unavailable, the project is not loaded, and the requested task cannot be completed by lint/build/code inspection.
- Before any unavoidable reopen/refocus action, tell the user why it is necessary and wait for approval.

## Validation Defaults

- Non-disruptive checks first: `npm run lint`, `git diff --check`, source inspection, and WeChat CLI commands that do not need to refocus the GUI.
- `cli build-npm` is acceptable after confirming DevTools service port is available.
- `cli preview` may refocus DevTools; use it sparingly and only when preview-package validation is needed.

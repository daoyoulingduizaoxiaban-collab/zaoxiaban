# DaoYouLingDuiZaoXiaBan Handoff

## Last Updated
- 2026-07-02 01:20 CST

## Repo State
- Project path: `/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- Branch: `codex`
- HEAD before this cleanup commit: `4b0656c 接續商品管理與交接文件`
- `origin/dev` and local `dev` still point at `a13ac84`; branch `codex` is ahead locally.
- `git stash list` is empty.
- Working tree is dirty with the current cleanup changes until committed.

## Current Focus
- New stable testing rule: do not repeatedly reopen/refocus WeChat DevTools. Use the already-open DevTools service port when possible, and ask before any unavoidable reopen.
- Continue the WeChat mini program work around `groupOrder`, product management, and group-order product setup.
- The prior README was still the upstream TDesign template; there was no project-specific handoff before this file.
- Current cleanup focus: make the group-order product library flow less hard-coded and remove obvious debug code.

## Completed
- Created a dedicated Codex handoff skill for this project only: `/Users/admin/.codex/skills/dao-you-ling-handoff`.
- Fixed the skill YAML frontmatter and `agents/openai.yaml`, then validated it with `quick_validate.py`; it should no longer be skipped by Codex skill loading.
- Scanned all `/Users/admin/.codex` and `/Users/admin/.agents` `SKILL.md` files: 539 files scanned, 0 YAML parse errors.
- Confirmed `counting-handoff`, `mind-steward-handoff`, `dao-you-ling-handoff`, and `video-asset-manager` are all valid under `quick_validate.py`.
- Fixed `sub-pages/groupOrder/detail/index.ts` so route `options.id` is saved as `groupOrderId`; this lets "管理商品" navigate to `/sub-pages/groupOrder/productList/index?id=...` instead of showing the generic error modal.
- Changed `sub-pages/product/add/index.ts` so submitting emits actual `products` through the opener event channel, instead of just `{ success: true }`.
- Changed `pages/productManagement/index.ts` so returned products are merged into `allProducts`, wrapped as `Product`, and displayed through existing search/status filtering.
- Aligned product status behavior with `enum/ProductStatus.ts`: `1 = 已下架`, `2 = 開放下單`.
- Fixed the product management WXML status tag/button text to use the enum-aligned status values.
- Cleaned lint-blocking legacy JS issues in tab-bar and old management pages: removed `console`, replaced optional chaining in JS files, removed unreachable tab-bar code, and fixed spacing/comment issues.
- Reworked `sub-pages/groupOrder/productList/index.ts` to read `options.id`, load the selected group order with `GroupOrderMock.fetchById`, derive `existingIds` from `rawList`, and keep `rawList` / `displayList` synchronized after delete/add.
- Reworked `sub-pages/groupOrder/product-picker/index.ts` to preserve selections across search, count selected items from `allProducts`, and return selected products through `EventChannel` instead of mutating the previous page instance.
- Removed stale `groupOrderList[0]`, `existingIds = [1]`, `console.*`, and the broken `models/itinerary` import from the group-order flow.
- Fixed `sub-pages/groupOrder/detail/index.ts` QR image error handling so it reads `groupOrder.qrCodeUrl` correctly and does not call `indexOf` on an empty value.

## Verification
- 2026-07-02: `npm run lint` passed.
- 2026-07-02: WeChat DevTools CLI with service port `45512` passed `islogin`, `open`, `build-npm`, `preview`, and `auto --trust-project`; preview total size was `1,881,506` bytes.
- 2026-07-02: `miniprogram-automator` connected successfully to existing websocket `ws://127.0.0.1:19512` when run with local network permission. Do not use `automator.launch(...)`.
- 2026-07-02: No-reopen GUI smoke test passed for all 27 `app.json` page routes via `automator.connect(...)` + `miniProgram.reLaunch(...)`; each route returned visible nodes/buttons/inputs where expected.
- 2026-07-02: Low-risk interaction checks passed: login method switch button, group-order empty save validation button, product add validation buttons, product-management add entry, and release draft button navigation to `pages/home/index`.
- `npm run lint` passed.
- `git diff --check` passed.
- `rg -n "groupOrderList\\[0\\]|existingIds = \\[1\\]|console\\.|models/itinerary|//TODO|// TODO" pages/groupOrder sub-pages/groupOrder -g '*.ts' -g '*.js'` found no matches after cleanup.
- `python3 /Users/admin/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/admin/.codex/skills/dao-you-ling-handoff` passed.
- YAML parse scan for all discovered skills under `/Users/admin/.codex` and `/Users/admin/.agents` passed: `YAML_PARSE_INVALID: 0`.
- `npx tsc --noEmit` could not run because the project does not have `typescript` installed; `npx` returned the TypeScript package guidance message.
- Running eslint with `--ext .js,.ts` is not useful yet because this project lacks a TypeScript-aware ESLint parser; it parses `enum` and type annotations as syntax errors.

## Changed Files
- `PROJECT_RULES.md`: added WeChat DevTools testing policy. Key rule: avoid disruptive `cli open`, `automator.launch`, and repeated `preview`; use existing service port `45512`; ask before unavoidable reopen/refocus.
- `HANDOFF.md`: new project-specific handoff file.
- `app.js`: comment spacing/newline cleanup for lint.
- `custom-tab-bar/index.js`: removed debug logs and unreachable fallback, fixed regex/comment style, changed `menu` to `const`.
- `pages/productManagement/index.ts`: handles returned products, search/status filtering, and enum-aligned status toggling.
- `pages/productManagement/index.wxml`: enum-aligned product status display and action button text.
- `sub-pages/product/add/index.ts`: defaults new products to `status: 2`, requires at least one saved product, emits products back to caller.
- `sub-pages/groupOrder/detail/index.ts`: stores `groupOrderId` from route options for product management navigation.
- `pages/groupOrder/index.ts`: removed debug logs and replaced failure logs with user-visible toast.
- `sub-pages/groupOrder/add/index.ts`: removed deleted itinerary model import and submit debug log.
- `sub-pages/groupOrder/productList/index.ts`: now loads by route group-order id, derives product exclusion IDs, syncs raw/display lists, and computes `priceDisplay`.
- `sub-pages/groupOrder/product-picker/index.ts`: now owns selection state in `allProducts`, keeps selection through search, and emits selected products back to the opener.
- `sub-pages/groupOrder/product-picker/index.wxml`: simplified tap binding to always call `toggleSelect` and let page logic ignore disabled products.
- `pages/customerOrders/*`, `pages/profile/*`, `pages/providers/*`, `pages/tourGuides/*`, `pages/home/index.js`: lint cleanup only.
- `/Users/admin/.codex/skills/dao-you-ling-handoff/SKILL.md`: new project-only handoff skill, scoped away from counting/Mind Steward/video projects.
- `/Users/admin/.codex/skills/dao-you-ling-handoff/agents/openai.yaml`: skill UI metadata; default prompt now correctly includes `$dao-you-ling-handoff`.

## Known Issues / Next Steps
- Highest-priority continuation: persist group-order product add/remove to a real API or a shared mock store; current add/remove is local page state only.
- Install and configure TypeScript tooling if stronger validation is needed: add `typescript` and a TypeScript-aware ESLint parser/config.
- Product and group-order data is still mock/local only; add real API integration when backend endpoints are ready.
- `sub-pages/groupOrder/product-picker/index.ts` still uses local mock product-library data; consider moving it to `mock/product/index.ts` or a real product API.
- Consider replacing the template README with project-specific setup notes after the product/group-order flow stabilizes.

## Notes
- Important user preference: do not let WeChat DevTools repeatedly steal focus while the user is typing. Reopening/refocusing DevTools is a last resort and requires explanation plus user approval.
- For GUI tests, prefer `automator.connect(...)` to an already-started automation websocket. If connect hangs, stop and report the blocker instead of retrying with disruptive commands.
- Do not mix this handoff with `counting-handoff`, `mind-steward-handoff`, or `video-asset-manager`; this project path is `/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`.
- Referenced `/Users/admin/.codex/skills/counting-handoff/SKILL.md` for handoff style only; did not edit the line-counting project.
- Latest commit before this work: `a13ac84 Merge branch 'before--ai' into dev`.
- Previous commit before this cleanup: `4b0656c 接續商品管理與交接文件`.

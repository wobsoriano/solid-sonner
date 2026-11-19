# Migration to e2e

Source: Playwright, `test/**/*.spec.ts` (guide: https://e2e.com/docs/migrate/playwright.md, engine: https://e2e.com/docs/web.md)
e2e: `e2e.config.ts`, tests `tests/**/*.e2e.ts`
Start dependencies: none. `app.command` starts the test page (`pnpm dev:test`, port 3001, from `test/vite.config.ts`).
Run old: `pnpm test` (dist builds: `pnpm build`, then `TEST_DIST=1 pnpm test` for `dist/index.jsx` and `TEST_DIST=default pnpm test` for `dist/index.js`)
Run new: `pnpm test:e2e` (dist builds: the same two `TEST_DIST` values)
Harness: done, smoke `tests/basic.e2e.ts` "toast is rendered and disappears after the default timeout" on chromium and webkit
Defect check: on

| Source             | e2e                | Status | Assertions (source → e2e) | Passing                                                     | Defect check                                                                                                                                         | Notes                                                                                                                 |
| ------------------ | ------------------ | ------ | ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| test/basic.spec.ts | tests/basic.e2e.ts | ported | 93 → 102                  | chromium and webkit 49/49 (294 runs), each dist entry 98/98 | Unowned reads in the dismissal effect: both fail 3. Raw boolean data attributes: both fail 3. Velocity dismissal ignoring the direction: both fail 1 | `test/basic.spec.ts` is upstream sonner's `test/tests/basic.spec.ts`, run against `test/app`, a port of its test page |
| test/solid.spec.ts | tests/solid.e2e.ts | ported | 4 → 4                     | chromium and webkit 2/2 (12 runs), each dist entry 4/4      | Height measured off the squashed toast: both fail the stacking test. The store write back inside the render: both fail the render test               | solid-sonner's own regressions, with buttons added to `test/app` for them                                             |

## Shared helpers

| Source                                                                                        | e2e                                                                                         | Used by                     |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| `page` fixture in test/support/fixtures.ts, the Solid diagnostics gate (`page.on('console')`) | `gateSolidDiagnostics()` in tests/support/diagnostics.ts, an init script and an `afterEach` | every test                  |
| `page.waitForTimeout(5000)` then a count                                                      | `toastStaysFor(browser, ms)`                                                                | both "is not removed" tests |
| `mouse.move(x, y, { steps })`                                                                 | `moveInSteps(browser, from, to, steps)`                                                     | the dismiss callback test   |
| `mouse.move(x, y, { steps: 5 })` flick                                                        | `flick(browser, dx)`, pointer events dispatched in the page                                 | both fast-swipe tests       |

## Gaps

- No console listener. An init script keeps the page's Solid diagnostics in `window.__solidDiagnostics` for the `afterEach`. Only the test sets it; the app has no test hook.
- No `waitForTimeout`. The hover and infinite-duration tests watch the document in the page past the toast's lifetime. The update test waits on the updated text with a timeout. The two "stays on screen" checks use a negated matcher, which holds for 1 s, then `toHaveCount(1)`.
- No `steps` on `mouse.move`. The dismiss callback test sends the moves itself. A flick sent through the mouse is too slow to cross the velocity threshold, so the fast-swipe tests dispatch pointer events in the page.
- No `toHaveCSS`. The two button style tests read `getComputedStyle` with `browser.evaluate`.
- No `rejects` matcher. The promise rejection test catches the rejection and compares its message.
- `getByLabel` is exact. The toaster's label is "Notices alt+T", so "aria labels are custom" passes `{ exact: false }` where Playwright matched the fragment.
- On native Windows, a run that starts `app.command` passes but does not exit, because the dev server it started keeps running. The docs ask for WSL on Windows. Locally, start `pnpm dev:test` first and `reuseExisting` uses it. CI runs on Linux.

## Next

Nothing left to port. Retiring `test/basic.spec.ts`, `playwright.config.ts`, `@playwright/test`, and the Playwright CI job waits for the maintainer's confirmation. `test/app` and `test/vite.config.ts` stay, since the e2e suite drives them.

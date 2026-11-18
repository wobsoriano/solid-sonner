# Migration to e2e

Source: Playwright, `test/**/*.test.tsx` (guide: https://e2e.com/docs/migrate/playwright.md, engine: https://e2e.com/docs/web.md)
e2e: `e2e.config.ts`, tests `tests/**/*.e2e.ts`
Start dependencies: none. `app.command` starts the dev server (`pnpm dev`, port 3000).
Run old: `pnpm test` (dist build: `pnpm build && TEST_DIST=1 pnpm test`)
Run new: `pnpm test:e2e` (dist build: `pnpm build && TEST_DIST=1 pnpm test:e2e`)
Harness: done, smoke `tests/basic.e2e.ts` "multiple default-position toasts remain stacked" on chromium
Defect check: on

| Source              | e2e                | Status | Assertions (source → e2e) | Passing                          | Defect check                                                                                                         | Notes                                                                                                                                      |
| ------------------- | ------------------ | ------ | ------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| test/Basic.test.tsx | tests/basic.e2e.ts | ported | 60 → 60                   | chromium 3/3 (84 runs), dist 1/1 | raw boolean data attributes: both fail the same 4 tests. Unowned reads in the dismissal effect: both fail the same 3 | The diagnostics gate waits two animation frames, so it also catches the 150-toast dismissal that the Playwright hook caught only by timing |

## Shared helpers

| Source                             | e2e                                        | Used by               |
| ---------------------------------- | ------------------------------------------ | --------------------- |
| `afterEach` Solid diagnostics gate | `test.afterEach` in tests/basic.e2e.ts     | every test            |
| `flick(page, dy)`                  | `flick(browser, dy)` in tests/basic.e2e.ts | both fast-flick tests |

## Gaps

- No element handles. The in-place update test tags the DOM node with `browser.evaluate` and reads the tag back.
- No `waitForTimeout`. The hover test watches the toast in the page past its 4 s lifetime. The height test waits for the toast's transitions to finish. The two "stays on screen" checks use a negated matcher, which holds for 1 s. The reused-id test waits for the toast to be gone.
- No `steps` on `mouse.move`. The swipe test sends 10 moves itself.
- On native Windows, a run that starts `app.command` passes but does not exit, because the dev server it started keeps running. The docs ask for WSL on Windows. Locally, start `pnpm dev` first and `reuseExisting` uses it. CI runs on Linux.

## Next

Nothing left to port. Retiring `test/Basic.test.tsx`, `playwright.config.ts`, `@playwright/test`, and the Playwright CI job waits for the maintainer's confirmation.

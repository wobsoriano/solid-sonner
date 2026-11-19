import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

declare global {
  interface Window {
    __solidDiagnostics: string[];
  }
}

// Fails a test on any Solid dev diagnostic. Solid's dev build reports them as
// console warnings, and e2e cannot listen to the console, so the page keeps
// them for the afterEach. Call it before any hook that opens the page.
export function gateSolidDiagnostics() {
  test.beforeEach(async ({ browser }) => {
    await browser.addInitScript(() => {
      const diagnostics: string[] = [];
      window.__solidDiagnostics = diagnostics;
      for (const level of ['warn', 'error'] as const) {
        const original = console[level].bind(console);
        console[level] = (...args: unknown[]) => {
          const [first] = args;
          if (typeof first === 'string' && /^\[[A-Z_]+\]/.test(first))
            diagnostics.push(first.split('\n')[0]!);
          original(...args);
        };
      }
    });
  });

  test.afterEach(async ({ browser }) => {
    // Dismissals land on the next animation frame, which can come after the test body returns.
    const diagnostics = await browser.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve(window.__solidDiagnostics)),
          );
        }),
    );
    expect(diagnostics).toEqual([]);
  });
}

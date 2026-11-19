import { expect, test as base } from '@playwright/test';

// Solid's dev build reports reactivity mistakes as console warnings. Any of them fails the test.
export const test = base.extend({
  page: async ({ page }, use) => {
    const diagnostics: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (/^\[[A-Z_]+\]/.test(text)) diagnostics.push(text.split('\n')[0]!);
    });
    await use(page);
    expect(diagnostics).toEqual([]);
  },
});

export { expect };

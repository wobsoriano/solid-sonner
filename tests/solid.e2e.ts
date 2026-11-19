// Ported from test/solid.spec.ts
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { gateSolidDiagnostics } from './support/diagnostics';

gateSolidDiagnostics();

test.beforeEach(async ({ app }) => {
  await app.open('/');
});

test.describe('Solid regressions', () => {
  test('toasts created together stack without overlapping', async ({ screen, browser }) => {
    await screen.getByTestId('stacked-toasts').click();
    const toasts = browser.locator('[data-sonner-toast]');
    await expect(toasts).toHaveCount(3);

    // Expanded, each toast sits one 14px gap above the next, whatever its height.
    await toasts.first().hover();
    await expect
      .poll(() =>
        browser.evaluate(() => {
          const boxes = [...document.querySelectorAll('[data-sonner-toast]')]
            .map((element) => element.getBoundingClientRect())
            .sort((a, b) => a.y - b.y);
          return boxes.slice(1).map((box, index) => Math.round(box.y - boxes[index]!.bottom));
        }),
      )
      .toEqual([14, 14]);
  });

  test('toast() called while a component renders is shown', async ({ screen }) => {
    await screen.getByTestId('toast-during-render').click();
    await expect(screen.getByText('Toast created during render')).toHaveCount(1);
  });
});

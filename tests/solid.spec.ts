// solid-sonner's own regressions, for what sonner's suite does not cover.
import { expect, test } from './support/fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('Solid regressions', () => {
  test('toasts created together stack without overlapping', async ({ page }) => {
    await page.getByTestId('stacked-toasts').click();
    const toasts = page.locator('[data-sonner-toast]');
    await expect(toasts).toHaveCount(3);

    // Expanded, each toast sits one 14px gap above the next, whatever its height.
    await toasts.first().hover();
    await expect
      .poll(() =>
        toasts.evaluateAll((elements) => {
          const boxes = elements
            .map((element) => element.getBoundingClientRect())
            .sort((a, b) => a.y - b.y);
          return boxes.slice(1).map((box, index) => Math.round(box.y - boxes[index]!.bottom));
        }),
      )
      .toEqual([14, 14]);
  });

  test('toast() called while a component renders is shown', async ({ page }) => {
    await page.getByTestId('toast-during-render').click();
    await expect(page.getByText('Toast created during render')).toHaveCount(1);
  });
});

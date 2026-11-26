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

  test('a run of toasts does not republish the lists that did not change', async ({ page }) => {
    // Every publish rebuilds the toaster's derived lists from scratch. Five
    // toasts in a row leave the set of positions in use exactly as it was, and
    // leave the secondary toaster's own list empty throughout, so a memo with
    // no equality gate commits a new-but-equivalent array run after run and
    // wakes everything below it for nothing. Solid reports that as
    // UNSTABLE_MEMO_OUTPUT, which the fixture fails the test on.
    for (let index = 0; index < 5; index++) await page.getByTestId('default-button').click();

    await expect(page.locator('[data-sonner-toast]')).toHaveCount(5);
  });
});

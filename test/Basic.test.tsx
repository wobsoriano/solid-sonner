import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { toast as toastApi } from '../src';

declare global {
  interface Window {
    // Set by dev/App.tsx so this suite can drive the library directly.
    __sonnerTest: {
      toast: typeof toastApi;
      remountToaster: (fire: () => void) => void;
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('Basic functionality', () => {
  test('toast is rendered from the hero button and disappears after the default timeout', async ({
    page,
  }) => {
    await page.getByTestId('hero-default-button').click();
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });

  test('success, error, and action toasts render from the types section', async ({ page }) => {
    await page.getByTestId('types-success').click();
    await expect(page.getByText('Event has been created', { exact: true })).toHaveCount(1);

    await page.getByTestId('types-error').click();
    await expect(page.getByText('Event has not been created', { exact: true })).toHaveCount(1);

    await page.getByTestId('types-action').click();
    await expect(page.locator('[data-button]')).toHaveCount(1);
  });

  test('promise toast shows loading then settles', async ({ page }) => {
    await page.getByTestId('types-promise').click();
    await expect(page.getByText('Loading...')).toHaveCount(1);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  });

  test('loading toast updates in place to success', async ({ page }) => {
    await page.getByTestId('types-loading').click();
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('Uploading...');
    const initialHandle = await toast.elementHandle();
    await expect(toast).toContainText('Saving...');
    await expect(toast).toContainText('Success!');
    const updatedHandle = await toast.elementHandle();
    expect(initialHandle).not.toBeNull();
    expect(updatedHandle).not.toBeNull();
    expect(
      await initialHandle?.evaluate((node, candidate) => node === candidate, updatedHandle),
    ).toBe(true);
  });

  test('custom toast renders from the types section', async ({ page }) => {
    await page.getByTestId('types-custom').click();
    await expect(page.getByText('A custom toast with default styling')).toHaveCount(1);
  });

  test('toast is removed after swiping down', async ({ page }) => {
    await page.getByTestId('hero-default-button').click();
    const toast = page.locator('[data-sonner-toast]');
    await toast.hover();
    const box = await toast.boundingBox();
    if (!box) throw new Error('Toast bounding box missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 300, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });

  test('toast is not removed when hovered', async ({ page }) => {
    await page.getByTestId('hero-default-button').click();
    await expect(page.locator('[data-sonner-toast]')).toBeVisible();
    await page.hover('[data-sonner-toast]');
    await page.waitForTimeout(5000);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  });

  test('multiple default-position toasts remain stacked', async ({ page }) => {
    await page.getByTestId('hero-default-button').click();
    await page.getByTestId('types-default').click();
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(2);
  });

  test('position controls move the active toaster', async ({ page }) => {
    await page.getByTestId('position-top-left').click();
    await expect(page.locator('[data-sonner-toaster]').first()).toHaveAttribute(
      'data-x-position',
      'left',
    );
    await expect(page.locator('[data-sonner-toaster]').first()).toHaveAttribute(
      'data-y-position',
      'top',
    );
  });

  test('expand controls change expanded behavior', async ({ page }) => {
    await page.getByTestId('expand-expand').click();
    await page.getByTestId('hero-default-button').click();
    await expect(page.locator('[data-sonner-toast]').first()).toHaveAttribute(
      'data-expanded',
      'true',
    );
  });

  test('rich colors can be enabled from the docs controls', async ({ page }) => {
    await page.getByTestId('other-rich-colors-success').click();
    await expect(page.locator('[data-sonner-toast]').first()).toHaveAttribute(
      'data-rich-colors',
      'true',
    );
  });

  test('close button can be enabled from the docs controls', async ({ page }) => {
    await page.getByTestId('other-close-button').click();
    await expect(page.locator('[data-close-button]')).toHaveCount(1);
    await page.locator('[data-close-button]').click();
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });

  test('headless custom toast can be dismissed', async ({ page }) => {
    await page.getByTestId('other-headless').click();
    await expect(page.getByText('Event Created')).toHaveCount(1);
    await page.getByTestId('close-button').click();
    await expect(page.getByText('Event Created')).toHaveCount(0);
  });
});

// Each of these covers a fix ported from upstream sonner#777, driven through
// the `__sonnerTest` hook so the docs site needs no test-only UI.
test.describe('Upstream regressions', () => {
  test('classNames.default is only applied to toasts without a type', async ({ page }) => {
    await page.evaluate(() => {
      const classNames = { default: 'is-default', success: 'is-success' };
      window.__sonnerTest.toast('untyped', { classNames });
      window.__sonnerTest.toast.success('typed', { classNames });
    });

    await expect(page.locator('[data-sonner-toast]:not([data-type])')).toHaveClass(/is-default/);
    const success = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(success).toHaveClass(/is-success/);
    await expect(success).not.toHaveClass(/is-default/);
  });

  test('custom icon is only rendered once in a settled promise toast', async ({ page }) => {
    await page.evaluate(() => {
      const icon = document.createElement('span');
      icon.dataset.testid = 'custom-promise-icon';

      window.__sonnerTest.toast.promise(() => new Promise((resolve) => setTimeout(resolve, 100)), {
        loading: 'Loading...',
        success: 'Settled',
        icon,
      });
    });

    await expect(page.getByText('Settled')).toHaveCount(1);
    await expect(page.getByTestId('custom-promise-icon')).toHaveCount(1);
  });

  test('decorative icons are hidden from assistive technology', async ({ page }) => {
    await page.evaluate(() => window.__sonnerTest.toast.success('typed', { closeButton: true }));

    await expect(page.locator('[data-icon] svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-close-button] svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('toast created while the Toaster is unmounted is replayed on mount', async ({ page }) => {
    await page.evaluate(() => {
      const { toast, remountToaster } = window.__sonnerTest;
      remountToaster(() => toast('fired while unmounted'));
    });

    await expect(page.getByText('fired while unmounted')).toHaveCount(1);
  });

  test('a new toast reusing a dismissed id does not inherit its props', async ({ page }) => {
    await page.evaluate(() =>
      window.__sonnerTest.toast.success('has an action', {
        id: 'reused',
        duration: Number.POSITIVE_INFINITY,
        action: { label: 'Undo', onClick: () => {} },
      }),
    );
    await expect(page.locator('[data-button]')).toHaveCount(1);

    await page.evaluate(() => window.__sonnerTest.toast.dismiss('reused'));
    // Outlive the 200ms exit animation, so the id is genuinely free again.
    await page.waitForTimeout(400);

    // Infinite duration so auto-close can't stand in for the assertion below.
    await page.evaluate(() =>
      window.__sonnerTest.toast.success('no action', {
        id: 'reused',
        duration: Number.POSITIVE_INFINITY,
      }),
    );
    // One assertion, not two: without the fix the toast flashes up and is
    // removed again, so "is present" and "has no button" pass at different moments.
    await expect(page.locator('[data-sonner-toast]')).toHaveText('no action');
  });

  test('toast recreated right after being dismissed stays on screen', async ({ page }) => {
    await page.evaluate(() => {
      const { toast } = window.__sonnerTest;
      const id = toast('recreated');
      toast.dismiss(id);
      toast('recreated', { id });
    });

    await expect(page.getByText('recreated')).toHaveCount(1);
    // Outlives the dismissal that was already in flight when it was created.
    await page.waitForTimeout(600);
    await expect(page.getByText('recreated')).toHaveCount(1);
  });

  test('toast() clears the loading state of a toast with the same id', async ({ page }) => {
    await page.evaluate(() => window.__sonnerTest.toast.loading('loading...', { id: 'fixed' }));
    await expect(page.locator('[data-sonner-toast][data-type="loading"]')).toHaveCount(1);

    await page.evaluate(() => window.__sonnerTest.toast('plain now', { id: 'fixed' }));
    await expect(page.getByText('plain now')).toHaveCount(1);
    await expect(page.locator('[data-sonner-toast][data-type="loading"]')).toHaveCount(0);
  });

  test('toast.custom() clears the loading state of a toast with the same id', async ({ page }) => {
    await page.evaluate(() => window.__sonnerTest.toast.loading('loading...', { id: 'fixed' }));
    await expect(page.locator('[data-sonner-toast][data-type="loading"]')).toHaveCount(1);

    await page.evaluate(() =>
      window.__sonnerTest.toast.custom(
        // toast.custom takes a JSX.Element, which in Solid is a real DOM node.
        () => Object.assign(document.createElement('div'), { textContent: 'custom now' }),
        { id: 'fixed' },
      ),
    );
    await expect(page.getByText('custom now')).toHaveCount(1);
    await expect(page.locator('[data-sonner-toast][data-type="loading"]')).toHaveCount(0);
  });

  test('content fills the toast rather than hugging its text', async ({ page }) => {
    await page.evaluate(() => window.__sonnerTest.toast('Hi'));

    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible();

    const toastBox = await toast.boundingBox();
    const contentBox = await toast.locator('[data-content]').boundingBox();
    if (!toastBox || !contentBox) throw new Error('Missing bounding box');

    // Without flex: 1 the content would only be as wide as the word "Hi".
    expect(contentBox.width).toBeGreaterThan(toastBox.width * 0.8);
  });

  test('toast.custom() keeps an id of 0', async ({ page }) => {
    await page.evaluate(() =>
      window.__sonnerTest.toast.custom(
        () => Object.assign(document.createElement('div'), { textContent: 'zero' }),
        { id: 0 },
      ),
    );
    await expect(page.getByText('zero')).toHaveCount(1);

    // Updates that toast rather than opening a second one only if custom() kept
    // the id. Content stays the custom node: upstream's update branch keeps `jsx`.
    await page.evaluate(() => window.__sonnerTest.toast('replaced', { id: 0 }));
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  });

  test('dismissed toasts do not pile up in state', async ({ page }) => {
    // There is no separate history array any more, so a dismissed toast is
    // spliced out of the live store rather than trimmed later (sonner#729).
    await page.evaluate(() => {
      const { toast } = window.__sonnerTest;
      for (let i = 0; i < 150; i++) toast.dismiss(toast(`flood ${i}`));
    });

    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__sonnerTest.toast.toasts.length)).toBe(0);
  });

  // A disallowed direction is dampened below the 45px threshold, so velocity is
  // the only thing that can dismiss it. page.mouse round trips are far too slow
  // to reach that, which would make the test pass with the bug present, so the
  // events are dispatched in-page. setPointerCapture throws on a synthetic id.
  const flick = async (page: Page, dy: number) => {
    // Infinite duration so only the gesture can remove it, not the timer.
    await page.evaluate(() =>
      window.__sonnerTest.toast('swipe me', { duration: Number.POSITIVE_INFINITY }),
    );
    await expect(page.locator('[data-sonner-toast]')).toBeVisible();

    await page.evaluate((distance) => {
      const toast = document.querySelector('[data-sonner-toast]')!;
      Element.prototype.setPointerCapture = () => {};
      Element.prototype.releasePointerCapture = () => {};

      const box = toast.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const send = (type: string, clientY: number) => {
        toast.dispatchEvent(
          new PointerEvent(type, { bubbles: true, clientX: x, clientY, button: 0, pointerId: 1 }),
        );
      };

      send('pointerdown', y);
      send('pointermove', y + distance / 2);
      send('pointermove', y + distance);
      send('pointerup', y + distance);
    }, dy);
  };

  test('a fast flick in a direction that is not allowed does not dismiss', async ({ page }) => {
    // The Toaster defaults to bottom-right, so only 'bottom' and 'right' dismiss.
    await flick(page, -200);
    // A dismissed toast lingers for the 200ms exit animation.
    await page.waitForTimeout(500);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  });

  test('a fast flick in an allowed direction dismisses', async ({ page }) => {
    await flick(page, 200);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });
});

// Ported from test/Basic.test.tsx
import { test } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';
import type { toast as toastApi } from '../src';

declare global {
  interface Window {
    __sonnerTest: {
      toast: typeof toastApi;
      remountToaster: (fire: () => void) => void;
    };
    __solidDiagnostics: string[];
  }
}

const TOAST = '[data-sonner-toast]';

test.beforeEach(async ({ app }) => {
  await app.open('/');
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

// Resolves once every running transition on the first toast has finished.
const settleTransitions = (browser: Browser) =>
  browser.evaluate(async (selector) => {
    const toast = document.querySelector(selector)!;
    await Promise.all(toast.getAnimations().map((animation) => animation.finished));
    return null;
  }, TOAST);

test.describe('Basic functionality', () => {
  test('toast is rendered from the hero button and disappears after the default timeout', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('hero-default-button').click();
    await expect(browser.locator(TOAST)).toHaveCount(1);
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });

  test('success, error, and action toasts render from the types section', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('types-success').click();
    await expect(screen.getByText('Event has been created')).toHaveCount(1);

    await screen.getByTestId('types-error').click();
    await expect(screen.getByText('Event has not been created')).toHaveCount(1);

    await screen.getByTestId('types-action').click();
    await expect(browser.locator('[data-button]')).toHaveCount(1);
  });

  test('promise toast shows loading then settles', async ({ screen, browser }) => {
    await screen.getByTestId('types-promise').click();
    await expect(screen.getByText('Loading...', { exact: false })).toHaveCount(1);
    await expect(browser.locator(TOAST)).toHaveCount(1);
  });

  test('loading toast updates in place to success', async ({ screen, browser }) => {
    await screen.getByTestId('types-loading').click();
    const toast = browser.locator(TOAST).first();
    await expect(toast).toContainText('Uploading...');
    // No element handles in e2e: tag the node, then check the tag survives.
    await browser.evaluate((selector) => {
      Object.assign(document.querySelector(selector)!, { __original: true });
      return null;
    }, TOAST);
    await expect(toast).toContainText('Saving...');
    await expect(toast).toContainText('Success!');
    expect(
      await browser.evaluate(
        (selector) =>
          (document.querySelector(selector) as { __original?: boolean }).__original ?? false,
        TOAST,
      ),
    ).toBe(true);
  });

  test('custom toast renders from the types section', async ({ screen }) => {
    await screen.getByTestId('types-custom').click();
    await expect(
      screen.getByText('A custom toast with default styling', { exact: false }),
    ).toHaveCount(1);
  });

  test('toast is removed after swiping down', async ({ screen, browser }) => {
    await screen.getByTestId('hero-default-button').click();
    const toast = browser.locator(TOAST);
    await toast.hover();
    const box = await toast.boundingBox();
    if (!box) throw new Error('Toast bounding box missing');
    const x = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endY = box.y + box.height + 300;
    await browser.mouse.move(x, startY);
    await browser.mouse.down();
    for (let step = 1; step <= 10; step++)
      await browser.mouse.move(x, startY + ((endY - startY) * step) / 10);
    await browser.mouse.up();
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });

  test('toast is not removed when hovered', async ({ screen, browser }) => {
    await screen.getByTestId('hero-default-button').click();
    await expect(browser.locator(TOAST)).toBeVisible();
    await browser.locator(TOAST).hover();
    // Outlives the 4s default lifetime, recording whether the toast left at any point.
    const removed = await browser.evaluate(
      (selector) =>
        new Promise<boolean>((resolve) => {
          const list = document.querySelector(selector)!.parentElement!;
          let gone = false;
          const observer = new MutationObserver(() => {
            if (!list.querySelector(selector)) gone = true;
          });
          observer.observe(list, { childList: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(gone);
          }, 5000);
        }),
      TOAST,
    );
    expect(removed).toBe(false);
    await expect(browser.locator(TOAST)).toHaveCount(1);
  });

  test('hovering a toast keeps its height', async ({ screen, browser }) => {
    await screen.getByTestId('hero-default-button').click();
    const toast = browser.locator(TOAST);
    await expect(toast).toBeVisible();
    await settleTransitions(browser);
    const before = await toast.boundingBox();
    if (!before) throw new Error('Toast bounding box missing');

    await toast.hover();
    await expect(toast).toHaveAttribute('data-expanded', 'true');
    await settleTransitions(browser);
    const after = await toast.boundingBox();
    expect(after?.height).toBeCloseTo(before.height, 0);
  });

  test('the hotkey expands the toaster and Escape collapses it', async ({ screen, browser }) => {
    await screen.getByTestId('hero-default-button').click();
    const toast = browser.locator(TOAST);
    await expect(toast).toBeVisible();

    await browser.keyboard.press('Alt+KeyT');
    await expect(browser.locator('[data-sonner-toaster]')).toBeFocused();
    await expect(toast).toHaveAttribute('data-expanded', 'true');

    await browser.keyboard.press('Escape');
    await expect(toast).toHaveAttribute('data-expanded', 'false');
  });

  test('multiple default-position toasts remain stacked', async ({ screen, browser }) => {
    await screen.getByTestId('hero-default-button').click();
    await screen.getByTestId('types-default').click();
    await expect(browser.locator(TOAST)).toHaveCount(2);
  });

  test('position controls move the active toaster', async ({ screen, browser }) => {
    await screen.getByTestId('position-top-left').click();
    await expect(browser.locator('[data-sonner-toaster]').first()).toHaveAttribute(
      'data-x-position',
      'left',
    );
    await expect(browser.locator('[data-sonner-toaster]').first()).toHaveAttribute(
      'data-y-position',
      'top',
    );
  });

  test('expand controls change expanded behavior', async ({ screen, browser }) => {
    await screen.getByTestId('expand-expand').click();
    await screen.getByTestId('hero-default-button').click();
    await expect(browser.locator(TOAST).first()).toHaveAttribute('data-expanded', 'true');
  });

  test('rich colors can be enabled from the docs controls', async ({ screen, browser }) => {
    await screen.getByTestId('other-rich-colors-success').click();
    await expect(browser.locator(TOAST).first()).toHaveAttribute('data-rich-colors', 'true');
  });

  test('close button can be enabled from the docs controls', async ({ screen, browser }) => {
    await screen.getByTestId('other-close-button').click();
    await expect(browser.locator('[data-close-button]')).toHaveCount(1);
    await browser.locator('[data-close-button]').click();
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });

  test('headless custom toast can be dismissed', async ({ screen, browser }) => {
    await screen.getByTestId('other-headless').click();
    await expect(screen.getByText('Event Created')).toHaveCount(1);
    await screen.getByTestId('close-button').click();
    await expect(screen.getByText('Event Created')).toHaveCount(0);

    // toast.custom() builds its JSX in the caller, here a click handler with no
    // owner, so the demo's dynamic `class` binding is an unowned effect.
    await browser.evaluate(() => {
      const diagnostics = window.__solidDiagnostics;
      const index = diagnostics.findIndex((entry) => entry.startsWith('NO_OWNER_EFFECT:'));
      if (index !== -1) diagnostics.splice(index, 1);
      return null;
    });
  });
});

test.describe('Upstream regressions', () => {
  test('classNames.default is only applied to toasts without a type', async ({ browser }) => {
    await browser.evaluate(() => {
      const classNames = { default: 'is-default', success: 'is-success' };
      window.__sonnerTest.toast('untyped', { classNames });
      window.__sonnerTest.toast.success('typed', { classNames });
      return null;
    });

    await expect(browser).toHaveClass(browser.locator(`${TOAST}:not([data-type])`), /is-default/);
    const success = browser.locator(`${TOAST}[data-type="success"]`);
    await expect(browser).toHaveClass(success, /is-success/);
    await expect(browser).not.toHaveClass(success, /is-default/);
  });

  test('custom icon is only rendered once in a settled promise toast', async ({
    screen,
    browser,
  }) => {
    await browser.evaluate(() => {
      const icon = document.createElement('span');
      icon.dataset.testid = 'custom-promise-icon';

      window.__sonnerTest.toast.promise(() => new Promise((resolve) => setTimeout(resolve, 100)), {
        loading: 'Loading...',
        success: 'Settled',
        icon,
      });
      return null;
    });

    await expect(screen.getByText('Settled')).toHaveCount(1);
    await expect(screen.getByTestId('custom-promise-icon')).toHaveCount(1);
  });

  test('decorative icons are hidden from assistive technology', async ({ browser }) => {
    await browser.evaluate(() => {
      window.__sonnerTest.toast.success('typed', { closeButton: true });
      return null;
    });

    await expect(browser.locator('[data-icon] svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(browser.locator('[data-close-button] svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('toast created while the Toaster is unmounted is replayed on mount', async ({
    screen,
    browser,
  }) => {
    await browser.evaluate(() => {
      const { toast, remountToaster } = window.__sonnerTest;
      remountToaster(() => toast('fired while unmounted'));
      return null;
    });

    await expect(screen.getByText('fired while unmounted')).toHaveCount(1);
  });

  test('a new toast reusing a dismissed id does not inherit its props', async ({ browser }) => {
    await browser.evaluate(() => {
      window.__sonnerTest.toast.success('has an action', {
        id: 'reused',
        duration: Number.POSITIVE_INFINITY,
        action: { label: 'Undo', onClick: () => {} },
      });
      return null;
    });
    await expect(browser.locator('[data-button]')).toHaveCount(1);

    await browser.evaluate(() => {
      window.__sonnerTest.toast.dismiss('reused');
      return null;
    });
    // Outlive the 200ms exit animation, so the id is genuinely free again.
    await expect(browser.locator(TOAST)).toHaveCount(0);

    // Infinite duration so auto-close can't stand in for the assertion below.
    await browser.evaluate(() => {
      window.__sonnerTest.toast.success('no action', {
        id: 'reused',
        duration: Number.POSITIVE_INFINITY,
      });
      return null;
    });
    // One assertion, not two: without the fix the toast flashes up and is
    // removed again, so "is present" and "has no button" pass at different moments.
    await expect(browser.locator(TOAST)).toHaveText('no action');
  });

  test('toast recreated right after being dismissed stays on screen', async ({
    screen,
    browser,
  }) => {
    await browser.evaluate(() => {
      const { toast } = window.__sonnerTest;
      const id = toast('recreated');
      toast.dismiss(id);
      toast('recreated', { id });
      return null;
    });

    await expect(screen.getByText('recreated')).toHaveCount(1);
    // A negated matcher holds for 1s, outliving the dismissal already in flight.
    await expect(screen.getByText('recreated')).not.toHaveCount(0);
  });

  test('toast() clears the loading state of a toast with the same id', async ({
    screen,
    browser,
  }) => {
    await browser.evaluate(() => {
      window.__sonnerTest.toast.loading('loading...', { id: 'fixed' });
      return null;
    });
    await expect(browser.locator(`${TOAST}[data-type="loading"]`)).toHaveCount(1);

    await browser.evaluate(() => {
      window.__sonnerTest.toast('plain now', { id: 'fixed' });
      return null;
    });
    await expect(screen.getByText('plain now')).toHaveCount(1);
    await expect(browser.locator(`${TOAST}[data-type="loading"]`)).toHaveCount(0);
  });

  test('toast.custom() clears the loading state of a toast with the same id', async ({
    screen,
    browser,
  }) => {
    await browser.evaluate(() => {
      window.__sonnerTest.toast.loading('loading...', { id: 'fixed' });
      return null;
    });
    await expect(browser.locator(`${TOAST}[data-type="loading"]`)).toHaveCount(1);

    await browser.evaluate(() => {
      window.__sonnerTest.toast.custom(
        // toast.custom takes a JSX.Element, which in Solid is a real DOM node.
        () => Object.assign(document.createElement('div'), { textContent: 'custom now' }),
        { id: 'fixed' },
      );
      return null;
    });
    await expect(screen.getByText('custom now')).toHaveCount(1);
    await expect(browser.locator(`${TOAST}[data-type="loading"]`)).toHaveCount(0);
  });

  test('content fills the toast rather than hugging its text', async ({ browser }) => {
    await browser.evaluate(() => {
      window.__sonnerTest.toast('Hi');
      return null;
    });

    const toast = browser.locator(TOAST).first();
    await expect(toast).toBeVisible();

    const toastBox = await toast.boundingBox();
    const contentBox = await browser.locator(`${TOAST} [data-content]`).boundingBox();
    if (!toastBox || !contentBox) throw new Error('Missing bounding box');

    // Without flex: 1 the content would only be as wide as the word "Hi".
    expect(contentBox.width).toBeGreaterThan(toastBox.width * 0.8);
  });

  test('toast.custom() keeps an id of 0', async ({ screen, browser }) => {
    await browser.evaluate(() => {
      window.__sonnerTest.toast.custom(
        () => Object.assign(document.createElement('div'), { textContent: 'zero' }),
        { id: 0 },
      );
      return null;
    });
    await expect(screen.getByText('zero')).toHaveCount(1);

    // Updates that toast rather than opening a second one only if custom() kept
    // the id. Content stays the custom node: upstream's update branch keeps `jsx`.
    await browser.evaluate(() => {
      window.__sonnerTest.toast('replaced', { id: 0 });
      return null;
    });
    await expect(browser.locator(TOAST)).toHaveCount(1);
  });

  test('dismissed toasts do not pile up in the history', async ({ browser }) => {
    const historySize = await browser.evaluate(() => {
      const { toast } = window.__sonnerTest;
      for (let i = 0; i < 150; i++) toast.dismiss(toast(`flood ${i}`));

      return toast.getHistory().length;
    });

    expect(historySize).toBe(100);
  });

  // A disallowed direction is dampened below the 45px threshold, so velocity is
  // the only thing that can dismiss it. Mouse round trips are far too slow to
  // reach that, which would make the test pass with the bug present, so the
  // events are dispatched in-page. setPointerCapture throws on a synthetic id.
  const flick = async (browser: Browser, dy: number) => {
    // Infinite duration so only the gesture can remove it, not the timer.
    await browser.evaluate(() => {
      window.__sonnerTest.toast('swipe me', { duration: Number.POSITIVE_INFINITY });
      return null;
    });
    await expect(browser.locator(TOAST)).toBeVisible();

    await browser.evaluate(
      ({ selector, distance }) => {
        const toast = document.querySelector(selector)!;
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
        return null;
      },
      { selector: TOAST, distance: dy },
    );
  };

  test('a fast flick in a direction that is not allowed does not dismiss', async ({ browser }) => {
    // The Toaster defaults to bottom-right, so only 'bottom' and 'right' dismiss.
    await flick(browser, -200);
    // A negated matcher holds for 1s, past the 200ms exit animation of a dismissal.
    await expect(browser.locator(TOAST)).not.toHaveCount(0);
  });

  test('a fast flick in an allowed direction dismisses', async ({ browser }) => {
    await flick(browser, 200);
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });
});

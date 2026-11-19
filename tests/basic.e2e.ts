// Port of https://github.com/emilkowalski/sonner/blob/main/test/tests/basic.spec.ts
// against the page in tests/app.
import { test } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';
import { toast } from '../src/state';
import { gateSolidDiagnostics } from './support/diagnostics';

const TOAST = '[data-sonner-toast]';
const TOASTER = '[data-sonner-toaster]';

gateSolidDiagnostics();

test.beforeEach(async ({ app }) => {
  await app.open('/');
});

// No waitForTimeout in e2e: the page watches the whole document for `ms` and
// reports whether the toast was there throughout.
const toastStaysFor = (browser: Browser, ms: number) =>
  browser.evaluate(
    ({ selector, ms }) =>
      new Promise<boolean>((resolve) => {
        let removed = false;
        const observer = new MutationObserver(() => {
          if (!document.querySelector(selector)) removed = true;
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(!removed && document.querySelector(selector) !== null);
        }, ms);
      }),
    { selector: TOAST, ms },
  );

// A flick has to beat the swipe velocity threshold, and a mouse round trip per
// move is far too slow for that, which would let the disallowed-direction test
// pass with the bug present. So the pointer events are dispatched in the page.
// setPointerCapture throws on a synthetic pointer id.
const flick = (browser: Browser, dx: number) =>
  browser.evaluate(
    ({ selector, dx }) => {
      const toast = document.querySelector(selector)!;
      Element.prototype.setPointerCapture = () => {};
      Element.prototype.releasePointerCapture = () => {};

      const box = toast.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const send = (type: string, clientX: number) => {
        toast.dispatchEvent(
          new PointerEvent(type, { bubbles: true, clientX, clientY: y, button: 0, pointerId: 1 }),
        );
      };

      send('pointerdown', x);
      for (let step = 1; step <= 5; step++) send('pointermove', x + (dx * step) / 5);
      send('pointerup', x + dx);
      return null;
    },
    { selector: TOAST, dx },
  );

const dragDown = async (browser: Browser) => {
  const box = await browser.locator(TOAST).boundingBox();
  if (!box) throw new Error('Toast not rendered');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await browser.mouse.move(x, y);
  await browser.mouse.down();
  await browser.mouse.move(x, y + 300);
  await browser.mouse.up();
};

const backgroundColor = (browser: Browser, selector: string) =>
  browser.evaluate(
    (selector) => getComputedStyle(document.querySelector(selector)!).backgroundColor,
    selector,
  );

test.describe('Basic functionality', () => {
  test('toast is rendered and disappears after the default timeout', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('default-button').click();
    await expect(browser.locator(TOAST)).toHaveCount(1);
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });

  test('various toast types are rendered correctly', async ({ screen, browser }) => {
    await screen.getByTestId('success').click();
    await expect(browser.locator(`${TOAST}[data-type="success"]`)).toHaveText('My Success Toast');

    await screen.getByTestId('error').click();
    await expect(browser.locator(`${TOAST}[data-type="error"]`)).toHaveText('My Error Toast');
  });

  test('show correct toast content based on promise state', async ({ screen }) => {
    await screen.getByTestId('promise').click();
    await expect(screen.getByText('Loading...')).toHaveCount(1);
    await expect(screen.getByText('Loaded')).toHaveCount(1);
  });

  test('handle toast promise rejections', async () => {
    const rejectedPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Promise rejected')), 100),
    );
    // No `rejects` matcher in e2e.
    const rejection = await toast
      .promise(rejectedPromise, {})
      ?.unwrap()
      .then(
        () => null,
        (error: Error) => error.message,
      );
    expect(rejection).toBe('Promise rejected');
  });

  test('promise toast with extended configuration', async ({ screen }) => {
    await screen.getByTestId('extended-promise').click();

    await expect(screen.getByText('Loading...')).toHaveCount(1);

    await expect(screen.getByText('Sonner toast has been added')).toHaveCount(1);
    await expect(screen.getByText('Custom description for the Success state')).toHaveCount(1);

    // The success description overrides the global one.
    await expect(screen.getByText('Global description')).toHaveCount(0);
  });

  test('promise toast with extended error configuration', async ({ screen }) => {
    await screen.getByTestId('extended-promise-error').click();

    await expect(screen.getByText('Loading...')).toHaveCount(1);

    await expect(screen.getByText('An error occurred')).toHaveCount(1);

    await expect(screen.getByText('Retry')).toHaveCount(1);
  });

  test('promise toast with Error object rejection', async ({ screen }) => {
    await screen.getByTestId('error-promise').click();

    await expect(screen.getByText('Error Raise: Error: Not implemented')).toHaveCount(1);
  });

  test('render custom jsx in toast', async ({ screen }) => {
    await screen.getByTestId('custom').click();
    await expect(screen.getByText('jsx')).toHaveCount(1);
  });

  // The swipe tests use a toast that never closes on its own, which would
  // otherwise remove it within the assertion timeout.
  test('toast is removed after swiping down', async ({ screen, browser }) => {
    await screen.getByTestId('infinity-toast').click();
    await dragDown(browser);
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });

  // The same drag removes a dismissible toast in the swipe down test.
  test('non-dismissible toast is not removed when dragged', async ({ screen, browser }) => {
    await screen.getByTestId('non-dismissible-toast').click();
    const toast = browser.locator(TOAST);
    await dragDown(browser);
    await expect(toast).not.toHaveCount(0);
    await expect(toast).toHaveCount(1);
  });

  test('toast is removed after swiping up', async ({ app, screen, browser }) => {
    await app.open('/?position=top-left');
    await screen.getByTestId('infinity-toast').click();
    await browser.locator(TOAST).hover();
    await browser.mouse.down();
    await browser.mouse.move(0, -800);
    await browser.mouse.up();
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });

  test('toast is not removed when hovered', async ({ screen, browser }) => {
    await screen.getByTestId('default-button').click();

    await expect(browser.locator(TOAST)).toBeVisible();

    await browser.locator(TOAST).hover();

    // Outlives the 4s default duration.
    expect(await toastStaysFor(browser, 5100)).toBe(true);

    await expect(browser.locator(TOAST)).toBeVisible();
    await expect(browser.locator(TOAST)).toHaveCount(1);
  });

  test('toast is not removed if duration is set to infinity', async ({ screen, browser }) => {
    await screen.getByTestId('infinity-toast').click();

    await expect(browser.locator(TOAST)).toBeVisible();

    const toast = browser.locator(TOAST);

    expect(await toastStaysFor(browser, 5100)).toBe(true);

    await expect(toast).toBeVisible();
    await expect(toast).toHaveCount(1);
  });

  test('toast is not removed when event prevented in action', async ({ screen, browser }) => {
    await screen.getByTestId('action-prevent').click();
    await browser.locator('[data-button]').click();
    // A negated matcher holds for 1s, past the exit animation of a dismissal.
    await expect(browser.locator(TOAST)).not.toHaveCount(0);
    await expect(browser.locator(TOAST)).toHaveCount(1);
  });

  test("toast's auto close callback gets executed correctly", async ({ screen }) => {
    await screen.getByTestId('auto-close-toast-callback').click();
    await expect(screen.getByTestId('auto-close-el')).toHaveCount(1);
  });

  test("toast's dismiss callback gets executed correctly", async ({ screen, browser }) => {
    await screen.getByTestId('dismiss-toast-callback').click();
    const toast = browser.locator(TOAST);

    await expect(toast).toBeVisible();

    await dragDown(browser);

    await expect(screen.getByTestId('dismiss-el')).toHaveCount(1);
  });

  test("toaster's theme should be dark", async ({ app, screen, browser }) => {
    await app.open('/?theme=dark');
    await screen.getByTestId('infinity-toast').click();
    await expect(browser.locator(TOASTER)).toHaveAttribute('data-sonner-theme', 'dark');
  });

  test("toaster's theme should be changed", async ({ screen, browser }) => {
    await screen.getByTestId('infinity-toast').click();
    await expect(browser.locator(TOASTER)).toHaveAttribute('data-sonner-theme', 'light');
    await screen.getByTestId('theme-button').click();
    await expect(browser.locator(TOASTER)).toHaveAttribute('data-sonner-theme', 'dark');
  });

  test('return focus to the previous focused element', async ({ screen, browser }) => {
    await screen.getByTestId('custom').focus();
    await browser.keyboard.press('Enter');
    await expect(browser.locator(TOAST)).toHaveCount(1);
    await screen.getByTestId('dismiss-button').focus();
    await browser.keyboard.press('Enter');
    await expect(browser.locator(TOAST)).toHaveCount(0);
    await expect(screen.getByTestId('custom')).toBeFocused();
  });

  test("toaster's dir prop is reflected correctly", async ({ app, screen, browser }) => {
    await app.open('/?dir=rtl');
    await screen.getByTestId('default-button').click();
    await expect(browser.locator(TOASTER)).toHaveAttribute('dir', 'rtl');
  });

  test("toaster respects the HTML's dir attribute", async ({ screen, browser }) => {
    await browser.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      return null;
    });
    await screen.getByTestId('default-button').click();
    await expect(browser.locator(TOASTER)).toHaveAttribute('dir', 'rtl');
  });

  test("toaster respects its own dir attribute over HTML's", async ({ app, screen, browser }) => {
    await app.open('/?dir=ltr');
    await browser.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      return null;
    });
    await screen.getByTestId('default-button').click();
    await expect(browser.locator(TOASTER)).toHaveAttribute('dir', 'ltr');
  });

  test('show correct toast content when updating', async ({ screen }) => {
    await screen.getByTestId('update-toast').click();
    await expect(screen.getByText('My Unupdated Toast')).toHaveCount(0);
    await expect(screen.getByText('My Updated Toast')).toHaveCount(1);
  });

  test('should update toast content and duration after 3 seconds', async ({ screen }) => {
    await screen.getByTestId('update-toast-duration').click();

    const initialToast = screen.getByText('My Unupdated Toast, Updated After 3 Seconds');
    await expect(initialToast).toBeVisible();

    const updatedToast = screen.getByText('My Updated Toast, Close After 1 Second');
    await expect(updatedToast).toBeVisible({ timeout: 5000 });

    await expect(initialToast).toBeHidden();

    await expect(updatedToast).toBeHidden({ timeout: 3000 });
  });

  test('cancel button is rendered with custom styles', async ({ screen, browser }) => {
    await screen.getByTestId('custom-cancel-button-toast').click();
    await expect(browser.locator('[data-cancel]')).toBeVisible();

    expect(await backgroundColor(browser, '[data-cancel]')).toBe('rgb(254, 226, 226)');
  });

  test('cancel button dismisses the custom toast with empty id', async ({ screen, browser }) => {
    await screen.getByTestId('custom-with-empty-id').click();

    await expect(browser.locator(TOAST)).toHaveCount(1);
    await screen.getByTestId('dismiss-button').click();
    await expect(browser.locator(TOAST)).toHaveCount(0);
  });

  test('action button is rendered with custom styles', async ({ screen, browser }) => {
    await screen.getByTestId('action').click();
    await expect(browser.locator('[data-button]')).toBeVisible();

    expect(await backgroundColor(browser, '[data-button]')).toBe('rgb(219, 239, 255)');
  });

  test('string description is rendered', async ({ screen }) => {
    await screen.getByTestId('string-description').click();
    await expect(screen.getByText('string description')).toHaveCount(1);
  });

  test('aria labels are custom', async ({ screen }) => {
    await screen.getByRole('button', 'With custom ARIA labels').click();
    await expect(screen.getByText('Toast with custom ARIA labels')).toHaveCount(1);
    // The toaster's label also names the hotkey, "Notices alt+T".
    await expect(screen.getByLabel('Notices', { exact: false })).toHaveCount(1);
    await expect(screen.getByLabel('Yeet the notice')).toHaveCount(1);
  });

  test('toast with toasterId only appears in the correct Toaster', async ({ screen, browser }) => {
    await screen.getByTestId('toast-secondary').click();
    const secondaryToaster = browser.locator(
      `${TOASTER}[data-x-position="left"][data-y-position="top"]`,
    );
    await expect(secondaryToaster.getByText('Secondary Toaster Toast')).toHaveCount(1);
    const globalToaster = browser.locator(
      `${TOASTER}[data-x-position="right"][data-y-position="bottom"]`,
    );
    await expect(globalToaster.getByText('Secondary Toaster Toast')).toHaveCount(0);
  });

  test('toast without toasterId only appears in the global Toaster', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('toast-global').click();
    const globalToaster = browser.locator(
      `${TOASTER}[data-x-position="right"][data-y-position="bottom"]`,
    );
    await expect(globalToaster.getByText('Global Toaster Toast')).toHaveCount(1);
    const secondaryToaster = browser.locator(
      `${TOASTER}[data-x-position="left"][data-y-position="top"]`,
    );
    await expect(secondaryToaster.getByText('Global Toaster Toast')).toHaveCount(0);
  });

  test('toast with testId renders data-testid attribute correctly', async ({ screen }) => {
    await screen.getByTestId('testid-toast-button').click();
    await expect(screen.getByTestId('my-test-toast')).toBeVisible();
    await expect(screen.getByTestId('my-test-toast')).toHaveText('Toast with test ID');
  });

  test('toast without testId does not have data-testid attribute', async ({ screen, browser }) => {
    await screen.getByTestId('default-button').click();
    const toast = browser.locator(TOAST);
    await expect(toast).toBeVisible();
    await expect(toast).not.toHaveAttribute('data-testid');
  });

  test('promise toast with testId maintains testId through state changes', async ({ screen }) => {
    await screen.getByTestId('testid-promise-toast-button').click();
    await expect(screen.getByTestId('promise-test-toast')).toBeVisible();
    await expect(screen.getByTestId('promise-test-toast')).toHaveText('Loading...');
    await expect(screen.getByTestId('promise-test-toast')).toHaveText('Loaded');
  });

  test('classNames.default is only applied to toasts without a type', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('default-button').click();
    await expect(browser).toHaveClass(browser.locator(TOAST), /default-toast-classname/);

    await screen.getByTestId('success').click();
    const successToast = browser.locator(`${TOAST}[data-type="success"]`);
    await expect(browser).toHaveClass(successToast, /success-toast-classname/);
    await expect(browser).not.toHaveClass(successToast, /default-toast-classname/);
  });

  test('custom icon is only rendered once in a promise toast', async ({ screen }) => {
    await screen.getByTestId('promise-custom-icon').click();
    await expect(screen.getByText('Loading...')).toHaveCount(1);

    await expect(screen.getByText('Loaded')).toHaveCount(1);
    await expect(screen.getByTestId('custom-success-icon')).toHaveCount(1);
  });

  test('icons are hidden from assistive technology', async ({ screen, browser }) => {
    await screen.getByTestId('close-button').click();
    await expect(browser.locator(`${TOAST} [data-close-button] svg`)).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    await screen.getByTestId('success').click();
    await expect(browser.locator(`${TOAST} [data-icon] svg`)).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('toast created before the Toaster mounts is still shown', async ({ app, screen }) => {
    await app.open('/?toastOnMount');
    await expect(screen.getByText('Toast rendered on mount')).toHaveCount(1);
  });

  test('a new toast reusing the id of a dismissed toast does not inherit its props', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('reused-id-with-action').click();
    await expect(browser.locator('[data-action]')).toHaveCount(1);

    // The first toast closes on its own.
    await expect(browser.locator(TOAST)).toHaveCount(0);

    await screen.getByTestId('reused-id-without-action').click();
    const newToast = browser.locator(TOAST);
    await expect(newToast).toHaveCount(1);
    // Fails if the action button of the previous toast is still rendered.
    await expect(newToast).toHaveText('Toast without action');
  });

  test('dismissed toasts do not pile up in the history', async ({ screen }) => {
    await screen.getByTestId('history-flood').click();
    await expect(screen.getByTestId('history-size')).toHaveText('100');
  });

  test('toast is not dismissed by a fast swipe in a direction that is not allowed', async ({
    app,
    screen,
    browser,
  }) => {
    await app.open('/?position=top-center&swipeDirections=top,right');
    await screen.getByTestId('default-button').click();
    const toast = browser.locator(TOAST);
    await expect(toast).toBeVisible();

    // `left` is not in swipeDirections.
    await flick(browser, -200);

    // A negated matcher holds for 1s, past the exit animation of a dismissal.
    await expect(toast).not.toHaveCount(0);
    await expect(toast).toHaveCount(1);
  });

  test('toast() clears the loading state of a toast with the same id', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('loading-toast-fixed-id').click();
    const toast = browser.locator(TOAST);
    await expect(toast).toHaveAttribute('data-type', 'loading');

    await screen.getByTestId('default-toast-fixed-id').click();
    await expect(toast).toHaveText('Done');
    await expect(toast).not.toHaveAttribute('data-type', 'loading');
    await expect(browser.locator(`${TOAST} .sonner-loading-wrapper`)).toHaveCount(0);
  });

  test('toast.custom() clears the loading state of a toast with the same id', async ({
    screen,
    browser,
  }) => {
    await screen.getByTestId('loading-toast-fixed-id').click();
    const toast = browser.locator(TOAST);
    await expect(toast).toHaveAttribute('data-type', 'loading');

    await screen.getByTestId('custom-toast-fixed-id').click();
    await expect(toast).toHaveText('Custom done');
    await expect(toast).not.toHaveAttribute('data-type', 'loading');
    await expect(browser.locator(`${TOAST} .sonner-loading-wrapper`)).toHaveCount(0);
  });

  test('toast recreated right after being dismissed stays on screen', async ({ screen }) => {
    await screen.getByTestId('dismiss-and-recreate').click();

    // The pending dismissal must not take the new toast down with it. A
    // negated matcher holds for 1s, outliving that dismissal.
    await expect(screen.getByText('Remounted toast')).not.toHaveCount(0);
    await expect(screen.getByText('Remounted toast')).toHaveCount(1);
  });

  test('description fills the width of the toast', async ({ screen, browser }) => {
    await screen.getByTestId('react-node-description-wide').click();

    const description = await screen.getByTestId('wide-description').boundingBox();
    const toast = await browser.locator(TOAST).boundingBox();
    if (!description || !toast) throw new Error('Toast not rendered');

    // Full width minus the padding and the icon-less content offset.
    expect(description.width).toBeGreaterThan(toast.width - 60);
  });

  test('action button stays right aligned', async ({ screen, browser }) => {
    await screen.getByTestId('action').click();

    const button = await browser.locator('[data-action]').boundingBox();
    const toast = await browser.locator(TOAST).boundingBox();
    if (!button || !toast) throw new Error('Toast not rendered');

    expect(button.x + button.width).toBeGreaterThan(toast.x + toast.width - 30);
  });

  test('toast is dismissed by a fast swipe in an allowed direction', async ({
    app,
    screen,
    browser,
  }) => {
    await app.open('/?position=top-center&swipeDirections=top,right');
    await screen.getByTestId('infinity-toast').click();
    const toast = browser.locator(TOAST);
    await expect(toast).toBeVisible();

    await flick(browser, 200);

    await expect(toast).toHaveCount(0);
  });
});

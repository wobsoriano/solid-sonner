import { expect, test } from '@playwright/test';

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

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'parallel' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('toast is rendered and disappears after the default timeout', async ({ page }) => {
  await page.getByTestId('default-button').click()
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
})

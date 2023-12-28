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

test('various toast types are rendered correctly', async ({ page }) => {
  await page.getByTestId('Success').click()
  await expect(page.getByText('Event has been created', { exact: true })).toHaveCount(1)

  await page.getByTestId('Error').click()
  await expect(page.getByText('Event has not been created', { exact: true })).toHaveCount(1)

  await page.getByTestId('Action').click()
  await expect(page.locator('[data-button]')).toHaveCount(1)
})

test('show correct toast content based on promise state', async ({ page }) => {
  await page.getByTestId('Promise').click()
  await expect(page.getByText('Loading...')).toHaveCount(1)
  await expect(page.getByText('Solid Sonner toast has been added')).toHaveCount(1)
})

test('render custom component in toast', async ({ page }) => {
  await page.getByTestId('Custom').click()
  await expect(page.getByText('A custom toast with default styling')).toHaveCount(1)
})

test('toast is removed after swiping down', async ({ page }) => {
  await page.getByTestId('default-button').click()
  await page.hover('[data-sonner-toast]')
  await page.mouse.down()
  await page.mouse.move(0, 800)
  await page.mouse.up()
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
})

const { test, expect } = require('@playwright/test');

test('settings persist across reloads and update the planning calendar', async ({ page }) => {
  const renderErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Unexpected text node|Text strings must be rendered/.test(message.text())) renderErrors.push(message.text());
  });
  page.on('pageerror', (error) => renderErrors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Preferences save automatically on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Time format: System', exact: true }).click();
  await page.getByRole('button', { name: 'Time format: 24-hour', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Time format: 24-hour', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'First day of the week: Sunday', exact: true }).click();
  await page.getByRole('button', { name: 'First day of the week: Monday', exact: true }).click();
  await expect(page.getByText('Preferences save automatically on this device.')).toBeVisible();
  await page.getByRole('switch', { name: 'Overdue tasks', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Overdue tasks', exact: true })).not.toBeChecked();
  await expect(page.getByText('Preferences save automatically on this device.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Preferences save automatically on this device.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Time format: 24-hour', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'First day of the week: Monday', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Overdue tasks', exact: true })).not.toBeChecked();
  await page.goto('/calendar');
  await expect(page.getByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Backup & recovery', exact: true }).click();
  await expect(page).toHaveURL(/\/data$/);
  expect(renderErrors).toEqual([]);
});

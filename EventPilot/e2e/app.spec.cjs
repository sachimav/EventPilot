const { test, expect } = require('@playwright/test');

async function fillEvent(page, title) {
  await page.getByLabel('Title *', { exact: true }).fill(title);
  await page.getByLabel('Description', { exact: true }).fill('Plan a memorable evening with friends.');
  await page.getByLabel('Category *', { exact: true }).fill('Celebration');
  await page.locator('input[type=date]').fill('2026-12-20');
  await page.locator('input[type=time]').fill('18:00');
  await page.getByLabel('Location *', { exact: true }).fill('Colombo');
  await page.getByLabel('Total budget (LKR) *', { exact: true }).fill('10000');
}

test('mobile: all event workspaces persist and their controls work', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Create event', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create event', exact: true })).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('link', { name: 'Create event', exact: true }).click();
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByText('Enter an event title.', { exact: true })).toBeVisible();
  await fillEvent(page, 'December celebration');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Event tasks', exact: true })).toBeVisible();
  const eventPath = new URL(page.url()).pathname;

  await page.getByRole('link', { name: 'Event tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await page.getByLabel('Title *', { exact: true }).fill('Book the venue');
  await page.locator('input[type=date]').fill('2026-12-18');
  await page.locator('input[type=time]').fill('12:00');
  await page.getByRole('button', { name: 'Priority *: High', exact: true }).click();
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Book the venue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit task', exact: true }).click();
  await page.getByLabel('Title *', { exact: true }).fill('Book the hall');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByRole('button', { name: 'Mark complete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark incomplete', exact: true })).toBeVisible();
  await page.goto(eventPath);
  await expect(page.getByText('100%', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Event budget', exact: true }).click();
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByLabel('Category *', { exact: true }).fill('Venue');
  await page.getByLabel('Description *', { exact: true }).fill('Hall deposit');
  await page.getByLabel('Estimated amount (Rs.) *', { exact: true }).fill('1500');
  await page.getByLabel('Actual amount (Rs.) *', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Save expense', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hall deposit', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit expense', exact: true }).click();
  await page.getByLabel('Actual amount (Rs.) *', { exact: true }).fill('1200');
  await page.getByRole('button', { name: 'Save expense', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Rs. 8,800.00', { exact: true })).toBeVisible();

  await page.goto(eventPath);
  await page.getByRole('link', { name: 'Event timeline', exact: true }).click();
  for (const [title, start, end] of [['Welcome', '18:00', '19:00'], ['Dinner', '18:30', '19:30']]) {
    await page.getByRole('button', { name: 'Add activity', exact: true }).click();
    await page.getByLabel('Title *', { exact: true }).fill(title);
    await page.locator('input[type=date]').fill('2026-12-20');
    await page.getByLabel('Start time *', { exact: true }).fill(start);
    await page.getByLabel('End time *', { exact: true }).fill(end);
    await page.getByRole('button', { name: 'Save activity', exact: true }).click();
    if (title === 'Dinner') {
      await expect(page.getByText('Schedule conflict', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Save anyway — allow overlap', exact: true }).click();
    }
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Edit activity', exact: true }).last().click();
  await page.getByLabel('Start time *', { exact: true }).fill('19:00');
  await page.getByLabel('End time *', { exact: true }).fill('20:00');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByText('19:00 — 20:00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete activity', exact: true }).last().click();
  await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dinner', exact: true })).toHaveCount(0);

  await page.goto(eventPath);
  await page.getByRole('link', { name: 'Edit event', exact: true }).click();
  await page.getByLabel('Title *', { exact: true }).fill('December party');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByText('December party', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('December party', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: '.expo/screenshots/home-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '.expo/screenshots/home-desktop.png', fullPage: true });

  await page.goto(`${eventPath}/budget`);
  await page.getByRole('button', { name: 'Delete expense', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
  await expect(page.getByText('No expenses for this event yet.', { exact: false })).toBeVisible();
  await page.goto(`${eventPath}/tasks`);
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
  await expect(page.getByText('Your checklist starts here', { exact: true })).toBeVisible();
  await page.goto(eventPath);
  await expect(page.getByText('Not Assessed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete event', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
  await expect(page.getByText('No events yet', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('task actions recover after an event is removed while editing', async ({ page }) => {
  await page.goto('/events/create');
  await fillEvent(page, 'First event');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await page.getByRole('link', { name: 'Event tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await page.getByLabel('Title *', { exact: true }).fill('Arrange transport');
  await page.locator('input[type=date]').fill('2026-12-19');
  await page.locator('input[type=time]').fill('10:00');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Arrange transport', exact: true })).toBeVisible();
  await page.goto('/events/create');
  await fillEvent(page, 'Keep event');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Event tasks', exact: true })).toBeVisible();
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Edit task', exact: true }).click();
  await page.getByRole('tab', { name: /My Events/ }).click();
  await page.getByRole('link', { name: 'View First event', exact: true }).click();
  await page.getByRole('button', { name: 'Delete event', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
  await page.getByRole('tab', { name: /Tasks/ }).click();
  await expect(page.getByRole('button', { name: 'Create task', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Title *', exact: true })).toBeEditable();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create task', exact: true })).toBeEnabled();
});

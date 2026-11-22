// Exploratory browser audit. Uses fresh browser contexts and a separately started preview.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const baseURL = process.env.EVENTPILOT_AUDIT_URL || 'http://127.0.0.1:4181';

async function createEvent(page, name, date = '2026-12-20', time = '10:00', end, save = true) {
  await page.goto('/events/create');
  for (const [label, value] of Object.entries({ 'Title *': name, 'Category *': 'Conference', 'Date *': date, 'Time *': time, 'Location *': 'Audit venue', 'Total budget (LKR) *': '1000' }))
    await page.getByLabel(label, { exact: true }).fill(value);
  if (end) {
    await page.getByLabel('End date (optional)', { exact: true }).fill(date);
    await page.getByLabel('End time (optional)', { exact: true }).fill(end);
  }
  if (!save) return;
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Event tasks', exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const filter = process.argv[2]?.toLowerCase();
  const results = filter && fs.existsSync('.expo/audit-results.json')
    ? JSON.parse(fs.readFileSync('.expo/audit-results.json', 'utf8')).filter(result => !result.name.toLowerCase().includes(filter)) : [];
  async function audit(name, timezoneId, run) {
    if (filter && !name.toLowerCase().includes(filter)) return;
    const context = await browser.newContext({ baseURL, timezoneId, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try { results.push({ name, ...(await run(page)), errors }); }
    catch (error) { results.push({ name, status: 'AUDIT ERROR', error: error.message, url: page.url(), screen: (await page.locator('body').innerText()).slice(0, 5000), errors }); }
    finally { await context.close(); }
    console.log(JSON.stringify(results.at(-1)));
  }

  await audit('Restore must recheck event conflicts', 'Asia/Colombo', async page => {
    for (const kind of ['archive', 'trash']) {
      const date = kind === 'archive' ? '2026-12-20' : '2026-12-21';
      const name = kind + ' reservation';
      await createEvent(page, name, date);
      if (kind === 'archive') await page.getByRole('button', { name: 'Archive event', exact: true }).click();
      else {
        await page.getByRole('button', { name: 'Delete event', exact: true }).click();
        await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
      }
      await expect(page).toHaveURL(/\/events$/);
      const replacement = await createEvent(page, kind + ' replacement', date);
      await page.goto('/data');
      const rowName = name + ' \u00b7 ' + (kind === 'archive' ? 'Archived' : 'Trash');
      const row = page.getByText(rowName, { exact: true }).locator('..');
      await row.getByRole('button', { name: 'Restore event', exact: true }).click();
      await expect(page.getByText('This time is already scheduled', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Back to recovery', exact: true }).click();
      await expect(page.getByText(rowName, { exact: true })).toBeVisible();
      await page.goto('/events');
      await expect(page.getByRole('link', { name: 'View ' + name, exact: true })).toHaveCount(0);
      await page.goto(replacement);
      await page.getByRole('button', { name: 'Archive event', exact: true }).click();
      await expect(page).toHaveURL(/\/events$/);
      await page.goto('/data');
      await page.getByText(rowName, { exact: true }).locator('..').getByRole('button', { name: 'Restore event', exact: true }).click();
      await expect(page.getByText(rowName, { exact: true })).toHaveCount(0);
      await page.goto('/events');
      await expect(page.getByRole('link', { name: 'View ' + name, exact: true })).toBeVisible();
    }
    return { status: 'PASS', detail: 'Archive and Trash restoration reject occupied slots, preserve records, and succeed after the slot is freed.' };
  });

  await audit('Events must reject nonexistent local times', 'America/New_York', async page => {
    await createEvent(page, 'DST gap event', '2027-03-14', '02:30', '03:00', false);
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.getByText('This local time is unavailable. Choose another time.', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/events\/create$/);
    await page.getByLabel('Time *', { exact: true }).fill('01:30');
    await page.getByLabel('End time (optional)', { exact: true }).fill('02:30');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.getByText('This local time is unavailable. Choose another time.', { exact: true })).toBeVisible();
    await page.getByLabel('End time (optional)', { exact: true }).fill('03:00');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Event tasks', exact: true })).toBeVisible();
    const eventPath = new URL(page.url()).pathname;
    await page.goto(eventPath + '/reports');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export calendar (.ics)', exact: true }).click();
    const calendar = fs.readFileSync(await (await download).path(), 'utf8');
    expect(calendar).toContain('BEGIN:VEVENT');
    expect(calendar).toContain('DTSTART:20270314T063000Z');
    expect(calendar).toContain('DTEND:20270314T070000Z');
    return { status: 'PASS', detail: 'Both nonexistent start/end times are rejected; corrected event exports with the expected UTC timestamps.' };
  });

  await audit('Switching events must not leak unsaved guest fields', 'Asia/Colombo', async page => {
    await createEvent(page, 'Guest event A');
    await createEvent(page, 'Guest event B', '2026-12-21');
    await page.goto('/guests');
    await page.getByRole('button', { name: 'Add guest', exact: true }).click();
    await page.getByLabel('Name *', { exact: true }).fill('Unsaved guest');
    await page.getByRole('button', { name: 'Select event: Guest event A', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add guest', exact: true })).toBeEnabled();
    return { status: 'PASS' };
  });

  await audit('Invalid routes and layouts recover without runtime errors', 'Asia/Colombo', async page => {
    for (const route of ['/events/0', '/events/not-an-id/edit', '/events/9007199254740992/tasks', '/events/999999/budget']) {
      await page.goto(route);
      await expect(page.getByText('Event not found', { exact: true })).toBeVisible();
    }
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['/', '/events', '/tasks', '/budget', '/calendar', '/data', '/settings', '/reminders', '/guests', '/vendors']) {
        await page.goto(route);
        await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        if (overflow) return { status: 'BUG CONFIRMED', detail: `Horizontal page overflow at ${width}px on ${route}` };
      }
    }
    return { status: 'PASS', detail: 'Invalid IDs and 40 route/viewport combinations checked.' };
  });

  await audit('Invalid backup imports must roll back every record', 'Asia/Colombo', async page => {
    await createEvent(page, 'Keep existing records');
    await page.goto('/data');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup', exact: true }).click();
    const backup = JSON.parse(fs.readFileSync(await (await download).path(), 'utf8'));
    backup.tables.Events[0].name = 'Must roll back';
    backup.tables.Tasks.push({ id: 999, event_id: 123456, title: 'Broken reference' });
    await page.getByLabel('Backup JSON', { exact: true }).fill(JSON.stringify(backup));
    await page.getByRole('button', { name: 'Validate and restore', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: /^Missing Events reference in backup\.$/ })).toBeVisible();
    await page.goto('/events');
    await expect(page.getByRole('link', { name: 'View Keep existing records', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Must roll back', exact: true })).toHaveCount(0);
    return { status: 'PASS', detail: 'A failed child import rolls back the parent insert and preserves existing events.' };
  });

  await audit('Unvisited web screens must remain available after connection loss', 'Asia/Colombo', async page => {
    await page.goto('/');
    await expect(page.getByText('Your next great moment.', { exact: true })).toBeVisible();
    await page.context().setOffline(true);
    await page.getByRole('tab', { name: /Tasks/ }).click();
    try {
      await expect(page.getByText('Task Manager', { exact: true })).toBeVisible({ timeout: 8000 });
      for (const [tab, title] of [['Budget', 'Budget Manager'], ['Calendar', 'Planning calendar'], ['Events', 'My events']]) {
        await page.getByRole('tab', { name: new RegExp(tab) }).click();
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(page.getByText('Make EventPilot work your way.', { exact: true })).toBeVisible();
      return { status: 'PASS' };
    } catch {
      return { status: 'BUG CONFIRMED', detail: 'After loading Home and losing network, the first visit to Tasks cannot load its screen bundle.' };
    }
  });

  await browser.close();
  fs.mkdirSync('.expo', { recursive: true });
  fs.writeFileSync('.expo/audit-results.json', JSON.stringify(results, null, 2));
  if (results.some(result => result.status !== 'PASS' || result.errors.length)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });

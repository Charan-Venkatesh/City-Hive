import { test, expect } from '@playwright/test';
import { ownerApi } from './helpers.js';

async function openAsOwner(page, request) {
  const auth = await ownerApi(request);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), auth.Authorization.replace('Bearer ', ''));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A little order/ })).toBeVisible();
}

test('dashboard is short, branch-aware and its cards open filtered lists', async ({ page, request }) => {
  await openAsOwner(page, request);
  expect(await page.locator('main tbody tr').count()).toBe(0);
  await expect(page.locator('.kpi-card')).toHaveCount(8);
  await page.getByLabel('Branch').selectOption({ index: 1 });
  await page.locator('.kpi-card', { hasText: 'Open complaints' }).click();
  await expect(page.getByRole('heading', { name: 'Complaints', level: 1 })).toBeVisible();
  await expect(page.locator('.filter-summary')).toContainText('Status: Not resolved');
  await expect(page.locator('.filter-summary')).toContainText('Branch:');
});

test('rooms show the fee-plan state instead of a misleading zero price', async ({ page, request }) => {
  await openAsOwner(page, request);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Rooms')).click());
  await expect(page.locator('.room-tile').first()).toContainText('Fee plan not assigned');
});

test('new resident form pre-fills a generated temporary password and labels are clear', async ({ page, request }) => {
  await openAsOwner(page, request);
  await page.getByRole('button', { name: /Add resident/ }).first().click();
  const pw = page.locator('.modal [name=temporary_password]');
  await expect(pw).toHaveValue(/.{14,}/);
  const first = await pw.inputValue();
  await page.getByRole('button', { name: 'Generate a new one' }).click();
  expect(await pw.inputValue()).not.toBe(first);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Residents')).click());
  await expect(page.getByLabel('Room status')).toBeVisible();
});

test('fees page is split into Plans, Invoices and Payments tabs', async ({ page, request }) => {
  await openAsOwner(page, request);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Fees')).click());
  await expect(page.getByRole('tab', { name: /Plans/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fee ledger' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment history' })).toHaveCount(0);
  await page.getByRole('tab', { name: /Payments/ }).click();
  await expect(page.getByRole('heading', { name: 'Payment history' })).toBeVisible();
});

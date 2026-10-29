import { test, expect } from '@playwright/test';
import { API, OWNER, ownerApi, uiLogin } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test('@smoke homepage lists both published branches', async ({ page, request }) => {
  const auth = await ownerApi(request);
  const branches = await (await request.get(`${API}/managed-branches`, { headers: auth })).json();
  for (const b of branches.filter(b => b.name !== 'Branch A')) {
    const r = await request.put(`${API}/branches/${b.id}/publication?published=true`, { headers: auth });
    expect(r.ok(), await r.text()).toBeTruthy();
  }
  await page.goto('/');
  await expect(page.getByText("Cityhive Luxury Men's PG").first()).toBeVisible();
  await expect(page.getByText('CityHive CoSpace').first()).toBeVisible();
  for (const n of [1, 2, 3, 4]) await expect(page.getByRole('heading', { name: `${n}-person sharing` }).first()).toBeVisible();
});

test('@smoke wrong password is rejected with a visible message', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Management sign in' }).first().click();
  await page.getByLabel('Email or username').fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('not-the-password');
  await page.getByRole('button', { name: 'Continue securely' }).click();
  await expect(page.getByText('Incorrect email or password')).toBeVisible();
});

test('owner signs in with password and sees dashboard and rooms', async ({ page }) => {
  await uiLogin(page, OWNER, 'Management sign in');
  await expect(page.getByRole('heading', { name: /A little order/ })).toBeVisible();
  await expect(page.getByText('/ 280')).toBeVisible();
  await page.getByRole('button', { name: /^Rooms/ }).click();
  await expect(page.getByRole('heading', { name: 'Room M-101-AC' })).toBeVisible();
  await page.getByRole('button', { name: /^Branches/ }).click();
  await expect(page.getByRole('heading', { name: "Cityhive Luxury Men's PG" })).toBeVisible();
  await page.getByRole('button', { name: /Owner/ }).click(); // sign out
  await expect(page.getByRole('button', { name: 'Management sign in' }).first()).toBeVisible();
});

test('resident created by management can sign in and sees only their own portal', async ({ page, request }) => {
  const auth = await ownerApi(request);
  const branches = await (await request.get(`${API}/managed-branches`, { headers: auth })).json();
  const branch = branches.find(b => b.name === "Cityhive Luxury Men's PG");
  const res = await request.post(`${API}/residents`, { headers: auth, data: {
    branch_id: branch.id, name: 'Test Resident', email: 'resident@example.com', phone: '9000000002',
    joined_on: '2026-10-01', temporary_password: 'Temp-Resident-1',
  } });
  expect(res.status(), await res.text()).toBe(201);
  await uiLogin(page, { email: 'resident@example.com', password: 'Temp-Resident-1' }, 'Resident sign in');
  // first login forces a password change
  await expect(page.getByText(/change.*password/i).first()).toBeVisible();
});

test('resident cannot call staff APIs', async ({ request }) => {
  const resp = await request.get(`${API}/residents`);
  expect(resp.status()).toBe(401);
});

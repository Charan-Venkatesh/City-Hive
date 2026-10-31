import { test, expect } from '@playwright/test';
import { API, ownerApi } from './helpers.js';

test.describe.configure({ mode: 'serial' });
const MENS = "Cityhive Luxury Men's PG"; const stamp = Date.now().toString().slice(-6);
const money = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let auth, branchId, residentId, invoice, residentEmail;

async function api(request, method, path, data) { const r = await request[method](`${API}${path}`, { headers: auth, data }); return r; }
const getInvoice = async request => (await (await api(request, 'get', '/invoices')).json()).find(i => i.id === invoice.id);
const getPayments = async request => (await (await api(request, 'get', '/payments')).json()).filter(p => p.invoice_id === invoice.id);

async function setup(request) {
  auth ||= await ownerApi(request);
  if (invoice) return;
  branchId = (await (await api(request, 'get', '/managed-branches')).json()).find(b => b.name === MENS).id;
  await api(request, 'post', '/fee-plans', { branch_id: branchId, name: `Fees spec plan ${stamp}`, sharing: 3, monthly_fee: '7500', advance_amount: '8000', effective_from: '2026-01-01' });
  residentEmail = `fees${stamp}@example.com`;
  const r = await api(request, 'post', '/residents', { branch_id: branchId, name: `Fees Tester ${stamp}`, email: residentEmail, phone: '9666666666', joined_on: '2026-10-01', temporary_password: 'Temp#Resident9x' });
  residentId = (await r.json()).id;
  const room = Object.values(await (await api(request, 'get', '/rooms')).json()).find(x => x.branch_id === branchId && x.capacity === 3 && x.occupied === 0 && !x.ac && x.active);
  expect((await api(request, 'put', `/residents/${residentId}/allocation`, { room_id: room.id, discount: '0' })).status()).toBe(200);
  await api(request, 'post', '/billing/generate', { month: new Date().toISOString().slice(0, 8) + '01' });
  invoice = (await (await api(request, 'get', '/invoices')).json()).find(i => i.resident_id === residentId);
  expect(invoice.amount).toBe('7500.00');
}
async function openFees(page, request, tab = 'Invoices', token) {
  await setup(request);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), token || auth.Authorization.replace('Bearer ', ''));
  await page.goto('/'); await expect(page.locator('nav button').first()).toBeAttached();
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Fees')).click());
  await expect(page.locator('.ds-page h1')).toHaveText('Fees & payments');
  if (token === undefined) await page.getByRole('tab', { name: new RegExp('^' + tab) }).click();
}
const dlg = page => page.locator('.dlg');
const row = (page, text) => page.locator('.ds-table tbody tr', { hasText: text });
async function search(page, text) { await page.getByLabel('Search', { exact: true }).fill(text); }

test('1. invoice totals strip equals the rows shown and the table is not clipped at 1280px', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFees(page, request);
  const all = await (await api(request, 'get', '/invoices')).json(), sum = k => all.reduce((t, i) => t + Math.round(Number(i[k]) * 100), 0) / 100;
  const stats = page.locator('.ds-stats .ds-stat');
  await expect(stats.nth(0)).toContainText(money(sum('amount'))); await expect(stats.nth(1)).toContainText(money(sum('paid'))); await expect(stats.nth(2)).toContainText(money(sum('balance')));
  const clip = await page.locator('.ds-table-wrap').first().evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth }));
  expect(clip.sw).toBeLessThanOrEqual(clip.cw + 1);                                       // the Action column used to be cut off here
  await search(page, invoice.invoice_number);
  await expect(row(page, invoice.invoice_number)).toHaveCount(1);
  await expect(row(page, invoice.invoice_number).getByRole('button', { name: 'Record payment' })).toBeVisible();
  await expect(stats.nth(0)).toContainText(money(invoice.amount));                        // strip follows the filter
  await expect(page.locator('.filter-summary')).toContainText('Showing 1 of');
});

test('2. filters combine, show chips, and the same bar is visible on the Payments tab', async ({ page, request }) => {
  await openFees(page, request);
  await search(page, invoice.invoice_number);
  await page.getByLabel('Invoice status').selectOption('paid');
  await expect(page.locator('.filter-summary')).toContainText('Showing 0 of'); await expect(page.getByText('No invoices match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear Invoice status filter' }).click();
  await expect(page.locator('.filter-summary')).toContainText('Showing 1 of');
  await page.getByRole('tab', { name: /^Payments/ }).click();
  await expect(page.getByLabel('Search', { exact: true })).toHaveValue(invoice.invoice_number);        // filters are not hidden state any more
  await expect(page.locator('.filter-summary')).toContainText('Showing');
});

test('3. partial payment: amount starts at the balance, UPI needs a reference, totals update', async ({ page, request }) => {
  await openFees(page, request); await search(page, invoice.invoice_number);
  await row(page, invoice.invoice_number).getByRole('button', { name: 'Record payment' }).click();
  await expect(dlg(page)).toBeVisible();
  await expect(dlg(page).getByLabel('Amount received (₹)')).toHaveValue(invoice.balance);               // default = outstanding balance
  await expect(dlg(page).getByRole('radio', { name: 'Cash' })).toBeChecked();
  await expect(dlg(page).getByLabel(/reference/i)).toHaveCount(0);
  await dlg(page).getByRole('radio', { name: 'UPI' }).check({ force: true });
  await expect(dlg(page).getByLabel('UPI reference')).toBeVisible();
  await dlg(page).getByRole('radio', { name: 'Cash' }).check({ force: true });
  await dlg(page).getByLabel('Amount received (₹)').fill('2500');                                        // editable partial amount
  await dlg(page).getByRole('button', { name: 'Record payment' }).click();
  await expect(dlg(page)).toHaveCount(0);
  const inv = await getInvoice(request); expect(inv.paid).toBe('2500.00'); expect(inv.balance).toBe('5000.00');
  await expect(row(page, invoice.invoice_number)).toContainText(money(5000));
  expect((await getPayments(request)).map(p => p.amount)).toEqual(['2500.00']);
});

test('4. UPI payment requires its reference, then settles the invoice', async ({ page, request }) => {
  await openFees(page, request); await search(page, invoice.invoice_number);
  await row(page, invoice.invoice_number).getByRole('button', { name: 'Record payment' }).click();
  await expect(dlg(page).getByLabel('Amount received (₹)')).toHaveValue('5000.00');
  await dlg(page).getByRole('radio', { name: 'UPI' }).check({ force: true });
  await dlg(page).getByRole('button', { name: 'Record payment' }).click();
  await expect(dlg(page)).toBeVisible(); expect((await getPayments(request)).length).toBe(1);             // blocked: no reference
  await dlg(page).getByLabel('UPI reference').fill('UTR' + stamp);
  await dlg(page).getByRole('button', { name: 'Record payment' }).click(); await expect(dlg(page)).toHaveCount(0);
  const inv = await getInvoice(request); expect(inv.status).toBe('paid'); expect(inv.balance).toBe('0.00');
  await expect(row(page, invoice.invoice_number)).toContainText('Settled'); await expect(row(page, invoice.invoice_number).locator('.ds-pill')).toHaveText('Paid');
  const pays = await getPayments(request); expect(pays.map(p => p.method).sort()).toEqual(['cash', 'upi']); expect(pays.find(p => p.method === 'upi').reference).toBe('UTR' + stamp);
});

test('5. receipt and invoice PDF download; invoice detail lists the payments', async ({ page, request }) => {
  await openFees(page, request); await search(page, invoice.invoice_number);
  const menuBtn = row(page, invoice.invoice_number).getByRole('button', { name: /More actions/ });
  await menuBtn.click(); await expect(page.getByRole('menu')).toBeVisible();
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.getByRole('menuitem', { name: 'Invoice PDF' }).click();
  const pdf = await downloadPromise;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
  await menuBtn.click(); await page.getByRole('menuitem', { name: 'View payments' }).click();
  await expect(dlg(page)).toContainText(invoice.invoice_number); await expect(dlg(page).locator('.ds-listrow')).toHaveCount(2);
  await dlg(page).getByRole('button', { name: 'Close', exact: true }).click(); await expect(dlg(page)).toHaveCount(0);
  await page.getByRole('tab', { name: /^Payments/ }).click(); await search(page, invoice.invoice_number);
  const [receipt] = await Promise.all([page.waitForEvent('download'), page.locator('.ds-table tbody tr').first().getByRole('button', { name: 'Receipt' }).click()]);
  expect(receipt.suggestedFilename()).toMatch(/^SW-\d{6}\.pdf$/);
});

test('6. Reverse is inside the row menu, needs a reason, and reopens the balance without deleting history', async ({ page, request }) => {
  await openFees(page, request, 'Payments'); await search(page, invoice.invoice_number);
  const first = page.locator('.ds-table tbody tr').filter({ hasText: 'CASH' });
  await expect(first.getByRole('button', { name: 'Reverse' })).toHaveCount(0);                        // not sitting beside Receipt any more
  const menu = first.getByRole('button', { name: /More actions/ });
  await menu.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible(); await expect(page.getByRole('menuitem', { name: 'Reverse payment' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('menu')).toHaveCount(0); await expect(menu).toBeFocused();   // keyboard: Escape returns focus
  await menu.click(); await page.getByRole('menuitem', { name: 'Reverse payment' }).click();
  await expect(dlg(page)).toContainText('This cannot be undone');
  await dlg(page).getByRole('button', { name: 'Confirm reversal' }).click();
  await expect(dlg(page)).toBeVisible(); expect((await getInvoice(request)).paid).toBe('7500.00');   // blocked without a reason
  await dlg(page).getByLabel('Reason for correction').fill('Entered against the wrong invoice');
  await dlg(page).getByRole('button', { name: 'Confirm reversal' }).click(); await expect(dlg(page)).toHaveCount(0);
  const inv = await getInvoice(request); expect(inv.balance).toBe('2500.00');
  const pays = await getPayments(request); expect(pays.length).toBe(2); expect(pays.find(p => p.method === 'cash').reversed_at).toBeTruthy();   // history kept
  await expect(first.locator('.ds-pill')).toHaveText('Reversed');
});

test('7. fee plans: create with defaults, edit, and a clash is explained inside the dialog', async ({ page, request }) => {
  await openFees(page, request, 'Plans');
  await page.getByRole('button', { name: '+ Add fee plan' }).first().click();
  await dlg(page).locator('select').first().selectOption({ label: MENS });
  await dlg(page).getByRole('radio', { name: '7', exact: true }).check({ force: true });
  await expect(dlg(page).getByLabel('Plan name')).toHaveValue(`${MENS} · 7-person sharing`);              // generated from the choices
  await dlg(page).getByLabel('Monthly fee (₹)').fill('4100'); await dlg(page).getByLabel('Advance (₹)').fill('2000');
  await dlg(page).getByRole('button', { name: 'Create plan' }).click(); await expect(dlg(page)).toHaveCount(0);
  const plans = await (await api(request, 'get', '/fee-plans')).json(), plan = plans.find(p => p.sharing === 7 && p.branch_id === branchId);
  expect(plan.billing_day).toBe(1); expect(plan.due_day).toBe(5); expect(plan.monthly_fee).toBe('4100.00'); expect(plan.advance_amount).toBe('2000.00');
  await page.getByRole('button', { name: '+ Add fee plan' }).first().click();                             // same branch and sharing again: overlap
  await dlg(page).locator('select').first().selectOption({ label: MENS }); await dlg(page).getByRole('radio', { name: '7', exact: true }).check({ force: true });
  await dlg(page).getByLabel('Monthly fee (₹)').fill('4200'); await dlg(page).getByRole('button', { name: 'Create plan' }).click();
  await expect(dlg(page).locator('[role=alert]')).toContainText('overlapping'); await expect(dlg(page)).toBeVisible();
  await dlg(page).getByRole('button', { name: 'Cancel' }).click();
  await page.locator('.ds-table tbody tr', { hasText: '7-person sharing' }).getByRole('button', { name: 'Edit' }).click();
  await dlg(page).getByLabel('Monthly fee (₹)').fill('4300'); await dlg(page).getByRole('button', { name: 'Save plan' }).click(); await expect(dlg(page)).toHaveCount(0);
  expect((await (await api(request, 'get', '/fee-plans')).json()).find(p => p.id === plan.id).monthly_fee).toBe('4300.00');
});

test('8. generate invoices: dialog, clear result message, and no duplicates on a second run', async ({ page, request }) => {
  await openFees(page, request);
  await page.getByRole('button', { name: 'Generate invoices' }).first().click();
  await expect(dlg(page).getByLabel('Billing month')).toHaveValue(new Date().toISOString().slice(0, 7));
  const before = (await (await api(request, 'get', '/invoices')).json()).length;
  await dlg(page).getByRole('button', { name: 'Generate invoices' }).click(); await expect(dlg(page)).toHaveCount(0);
  await expect(page.locator('.alert.success, [role=status]').filter({ hasText: /invoices? created for/ })).toBeVisible();
  expect((await (await api(request, 'get', '/invoices')).json()).length).toBe(before);                        // already billed: nothing duplicated
});

test('9. resident view: own invoices only, no admin actions, receipts still available', async ({ page, request }) => {
  await setup(request);
  const login = await (await request.post(`${API}/auth/login`, { data: { email: residentEmail, password: 'Temp#Resident9x' } })).json();
  await request.post(`${API}/auth/password`, { headers: { Authorization: 'Bearer ' + login.access_token }, data: { current_password: 'Temp#Resident9x', new_password: 'Resident#Own2026x' } });
  const token = (await (await request.post(`${API}/auth/login`, { data: { email: residentEmail, password: 'Resident#Own2026x' } })).json()).access_token;
  await openFees(page, request, 'Invoices', token);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Generate invoices|Send reminders|Record payment|Add fee plan/ })).toHaveCount(0);
  await expect(page.locator('section[aria-label="Payments"] .ds-table tbody tr')).toHaveCount(2);        // the resident's two payments (one reversed), nobody else's
  await expect(page.locator('section[aria-label="Invoices"] .ds-table tbody tr')).toHaveCount(1);
  await expect(page.locator('section[aria-label="Invoices"] .ds-table tbody tr')).toContainText(invoice.invoice_number);
  await expect(page.getByRole('button', { name: 'Invoice PDF' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'View financial account' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Reverse payment' })).toHaveCount(0);
});

const SIZES = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 780 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];
test('@smoke 10. fees page at 320, 360, 390, 768 and 1280: no sideways scroll, table on wide screens, rows on phones, dialogs keep their buttons visible', async ({ page, request }) => {
  await setup(request);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), auth.Authorization.replace('Bearer ', ''));
  await page.goto('/'); await expect(page.locator('nav button').first()).toBeAttached();
  for (const size of SIZES) {
    await page.setViewportSize(size); const tag = `${size.width}x${size.height}`;
    await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Fees')).click());
    for (const tab of ['Plans', 'Invoices', 'Payments']) {
      await page.getByRole('tab', { name: new RegExp('^' + tab) }).click();
      const g = await page.evaluate(() => { const w = document.querySelector('.ds-table-wrap'), l = document.querySelector('.ds-rows'); return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, empty: !w,
        table: w && getComputedStyle(w).display !== 'none', rows: l && getComputedStyle(l).display !== 'none', clip: w ? w.scrollWidth - w.clientWidth : 0 }; });
      expect(g.page, `${tag} ${tab}`).toBeLessThanOrEqual(1);
      if (g.empty) continue;                                                                      // a tab with no records shows the empty state instead of a list
      if (size.width < 600) { expect(g.rows, `${tag} ${tab}`).toBe(true); expect(g.table, `${tag} ${tab}`).toBe(false); }
      else { expect(g.table, `${tag} ${tab}`).toBe(true); if (size.width >= 1280) expect(g.clip, `${tag} ${tab}`).toBeLessThanOrEqual(1); }
    }
    await page.getByRole('tab', { name: /^Invoices/ }).click();
    const visible = page.locator(size.width < 600 ? '.ds-listrow' : '.ds-table tbody tr').filter({ hasText: invoice.invoice_number });
    await page.getByLabel('Search', { exact: true }).fill(invoice.invoice_number); await expect(visible.first()).toBeVisible();
    await visible.first().getByRole('button', { name: /More actions/ }).click(); await page.getByRole('menuitem', { name: 'View payments' }).click();
    const d = await page.evaluate(() => { const f = document.querySelector('.dlg-foot').getBoundingClientRect(); return { footBottom: f.bottom, vh: innerHeight, h: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    expect(d.footBottom, tag).toBeLessThanOrEqual(d.vh + 1); expect(d.h, tag).toBeLessThanOrEqual(1);
    await dlg(page).getByRole('button', { name: 'Close', exact: true }).click(); await expect(dlg(page)).toHaveCount(0);
    await page.getByLabel('Search', { exact: true }).fill('');
  }
});

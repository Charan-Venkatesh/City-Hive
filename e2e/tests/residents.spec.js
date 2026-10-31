import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { API, ownerApi } from './helpers.js';

test.describe.configure({ mode: 'serial' });
const MENS = "Cityhive Luxury Men's PG"; const stamp = Date.now().toString().slice(-6);
let auth, branchId, a, b;       // a: allocated resident with a fee plan, b: resident without a room

const call = (request, method, path, data) => request[method](`${API}${path}`, { headers: auth, data });
const getResident = async (request, id) => (await (await call(request, 'get', '/residents')).json()).find(r => r.id === id);

async function setup(request) {
  auth ||= await ownerApi(request);
  if (a) return;
  branchId = (await (await call(request, 'get', '/managed-branches')).json()).find(x => x.name === MENS).id;
  const planRes = await call(request, 'post', '/fee-plans', { branch_id: branchId, name: `Residents spec plan ${stamp}`, sharing: 3, monthly_fee: '7500', advance_amount: '8000', effective_from: '2026-01-01' });
  expect([201, 409], await planRes.text()).toContain(planRes.status());    // 409: another spec file already priced 3-sharing on this branch; use that plan
  const mk = async (name, email) => (await (await call(request, 'post', '/residents', { branch_id: branchId, name, email, phone: '9777777777', joined_on: '2026-10-01', temporary_password: 'Temp#Resident9x' })).json()).id;
  const idA = await mk(`Alloc Person ${stamp}`, `alloc${stamp}@example.com`), idB = await mk(`Roomless Person ${stamp}`, `roomless${stamp}@example.com`);
  const room = (await (await call(request, 'get', '/rooms')).json()).find(x => x.branch_id === branchId && x.capacity === 3 && x.occupied === 0 && !x.ac && x.active);
  expect((await call(request, 'put', `/residents/${idA}/allocation`, { room_id: room.id, discount: '0' })).status()).toBe(200);
  a = { id: idA, name: `Alloc Person ${stamp}`, room }; b = { id: idB, name: `Roomless Person ${stamp}` };
}
async function open(page, request, token) {
  await setup(request);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), token || auth.Authorization.replace('Bearer ', ''));
  await page.goto('/'); await expect(page.locator('nav button').first()).toBeAttached();
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(x => x.innerText.trim().startsWith('Residents')).click());
  await expect(page.locator('.ds-page h1')).toHaveText('Residents');
}
const phone = page => page.viewportSize().width < 600;
const rowOf = (page, name) => page.locator(phone(page) ? '.ds-listrow' : '.ds-table tbody tr', { hasText: name });
const dlg = page => page.locator('.dlg');
async function find(page, text) { await page.getByLabel('Search', { exact: true }).fill(text); }
async function menu(page, name) { await rowOf(page, name).getByRole('button', { name: /More actions/ }).click(); }

test('1. table: four columns, no clipping at 1280, and each row has just a primary action and a menu', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await open(page, request); await find(page, a.name);
  await expect(page.locator('.ds-table thead th:not(.ds-actions-col)')).toHaveText(['Resident', 'Room', 'Monthly fee', 'Status']);
  const wrap = await page.locator('.ds-table-wrap').evaluate(e => [e.scrollWidth, e.clientWidth]); expect(wrap[0]).toBeLessThanOrEqual(wrap[1] + 1);
  const row = rowOf(page, a.name); await expect(row).toHaveCount(1);
  await expect(row.locator('button')).toHaveCount(2);                                               // Move + ⋯ (it used to be six controls)
  await expect(row.getByRole('button', { name: 'Move' })).toBeVisible();
  await expect(row).toContainText(a.room.number); await expect(row).toContainText('Non-AC'); await expect(row).toContainText('₹7,500.00');
  await expect(row.locator('.ds-pill').first()).toHaveText('Review pending');
  await find(page, b.name); await expect(rowOf(page, b.name).getByRole('button', { name: 'Allocate room' })).toBeVisible(); await expect(rowOf(page, b.name)).toContainText('Unallocated');
});

test('2. filters: search, collapsible group, chips, reset, and an honest empty state', async ({ page, request }) => {
  await open(page, request);
  await expect(page.getByLabel('Search', { exact: true })).toBeVisible();
  await page.getByLabel('Room status').selectOption('unallocated');
  await expect(page.locator('.filter-summary')).toContainText('Room status: Unallocated'); await find(page, b.name);
  await expect(rowOf(page, b.name)).toHaveCount(1); await expect(rowOf(page, a.name)).toHaveCount(0);
  await find(page, 'zzz-nobody'); await expect(page.getByText('No residents match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Reset all' }).click(); await expect(page.locator('.filter-summary')).toContainText(/Showing \d+ of \d+/);
  await expect(page.getByLabel('Search', { exact: true })).toHaveValue('');
});

test('3. the primary action opens allocation for the right resident; the menu lists the other actions', async ({ page, request }) => {
  await open(page, request); await find(page, a.name);
  await rowOf(page, a.name).getByRole('button', { name: 'Move' }).click();
  await expect(dlg(page)).toContainText(a.name); await expect(dlg(page)).toContainText(`Currently in ${a.room.number}`);
  await dlg(page).getByRole('button', { name: 'Cancel' }).click(); await expect(dlg(page)).toHaveCount(0);
  const m = rowOf(page, a.name).getByRole('button', { name: /More actions/ });
  await m.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem')).toHaveText(['Review ID document', 'Financial account', 'Fee plan', 'Deactivate resident']);
  await expect(page.getByRole('menuitem', { name: 'Deactivate resident' })).toHaveClass(/danger/);
  await page.keyboard.press('Escape'); await expect(page.getByRole('menu')).toHaveCount(0); await expect(m).toBeFocused();
});

test('4. add resident: generated password, grouped fields, saved exactly, password shown once', async ({ page, request }) => {
  await open(page, request);
  await page.getByRole('button', { name: '+ Add resident' }).click();
  const pw = dlg(page).locator('[name=temporary_password]'); await expect(pw).toHaveValue(/.{14,}/);
  const first = await pw.inputValue(); await dlg(page).getByRole('button', { name: 'Generate a new one' }).click(); expect(await pw.inputValue()).not.toBe(first);
  await expect(dlg(page).locator('details.disclosure')).not.toHaveAttribute('open', '');                    // guardian, workplace, Aadhaar are progressive
  const email = `newres${stamp}@example.com`, password = await pw.inputValue();
  await dlg(page).locator('select[name=branch_id]').selectOption({ label: MENS });
  await dlg(page).getByLabel('Full name').fill(`New Resident ${stamp}`); await dlg(page).locator('input[name=email]').fill(email);
  await dlg(page).locator('input[name=phone]').fill('12345'); await dlg(page).getByRole('button', { name: 'Create resident' }).click();
  await expect(dlg(page)).toBeVisible();                                                                  // 5-digit phone is refused
  await dlg(page).locator('input[name=phone]').fill('9123456780');
  await dlg(page).locator('details.disclosure > summary').click(); await dlg(page).getByLabel('Guardian name').fill('Parent Name'); await dlg(page).getByLabel('Aadhaar last 4 digits').fill('4321');
  await dlg(page).getByRole('button', { name: 'Create resident' }).click(); await expect(dlg(page)).toHaveCount(0);
  await expect(page.locator('.alert.success, [role=status]').filter({ hasText: 'Temporary password: ' + password })).toBeVisible();
  const made = (await (await call(request, 'get', '/residents')).json()).find(r => r.email === email);
  expect(made.phone).toBe('9123456780'); expect(made.guardian).toBe('Parent Name'); expect(made.aadhaar_last4).toBe('4321'); expect(made.branch_id).toBe(branchId);
});

test('5. ID review: confirmation required, Aadhaar digits asked only when missing, outcome saved', async ({ page, request }) => {
  await open(page, request); await find(page, b.name);
  await menu(page, b.name); await page.getByRole('menuitem', { name: 'Review ID document' }).click();
  await expect(dlg(page)).toContainText('not a UIDAI identity verification');
  await dlg(page).getByRole('button', { name: 'Record review' }).click(); await expect(dlg(page)).toBeVisible();   // blocked: digits and confirmation missing
  expect((await getResident(request, b.id)).id_status).toBe('pending');
  await dlg(page).getByLabel('Aadhaar last four digits reviewed in person').fill('2468'); await dlg(page).getByRole('checkbox').check();
  await dlg(page).getByRole('button', { name: 'Record review' }).click(); await expect(dlg(page)).toHaveCount(0);
  const r = await getResident(request, b.id); expect(r.id_status).toBe('reviewed'); expect(r.aadhaar_last4).toBe('2468');
  await expect(rowOf(page, b.name).locator('.ds-pill').first()).toHaveText('Reviewed manually');
  await menu(page, b.name); await page.getByRole('menuitem', { name: 'Review ID document' }).click();
  await expect(dlg(page).getByLabel('Aadhaar last four digits reviewed in person')).toHaveCount(0);        // already on record: not asked again
  await dlg(page).getByRole('radio', { name: 'Rejected' }).check({ force: true }); await dlg(page).getByRole('checkbox').check();
  await dlg(page).getByRole('button', { name: 'Record review' }).click(); await expect(dlg(page)).toHaveCount(0);
  expect((await getResident(request, b.id)).id_status).toBe('rejected');
});

test('6. fee plan: shows what applies automatically, saves an override or clears it', async ({ page, request }) => {
  await open(page, request); await find(page, b.name); await menu(page, b.name); await page.getByRole('menuitem', { name: 'Fee plan' }).click();
  await expect(dlg(page)).toContainText('Plans apply once the resident has a room'); await dlg(page).getByRole('button', { name: 'Cancel' }).click();
  await find(page, a.name); await menu(page, a.name); await page.getByRole('menuitem', { name: 'Fee plan' }).click();
  await expect(dlg(page).locator('.price-panel')).toContainText('Applies automatically'); await expect(dlg(page).locator('.price-panel')).toContainText('₹7,500.00 / month');
  const options = await dlg(page).locator('select option').allInnerTexts(); expect(options.length).toBeGreaterThan(1);
  await dlg(page).locator('select').selectOption({ index: 1 }); await dlg(page).getByRole('button', { name: 'Save fee plan' }).click(); await expect(dlg(page)).toHaveCount(0);
  expect((await getResident(request, a.id)).fee_plan_id).not.toBeNull();
  await menu(page, a.name); await page.getByRole('menuitem', { name: 'Fee plan' }).click(); await dlg(page).locator('select').selectOption(''); await dlg(page).getByRole('button', { name: 'Save fee plan' }).click();
  await expect(dlg(page)).toHaveCount(0);                                                          // API reports the effective plan, so clearing the override is confirmed by the notice and an unchanged price
  await expect(page.locator('.alert.success, [role=status]').filter({ hasText: 'Resident fee plan updated' })).toBeVisible(); await expect(rowOf(page, a.name)).toContainText('₹7,500.00');
});

// Reads the isolated test database directly: the API reports the *effective* plan, so only the table shows whether an override is really stored.
const DB_PATH = new URL('../../backend/.e2e/e2e.db', import.meta.url).pathname;
const readDb = fn => { const db = new DatabaseSync(DB_PATH, { readOnly: true }); try { return fn(db); } finally { db.close(); } };
const storedPlan = id => readDb(db => db.prepare('SELECT fee_plan_id FROM residents WHERE id = ?').get(id).fee_plan_id);
const financeFingerprint = () => readDb(db => ['invoices', 'payments', 'financial_ledger_events', 'allocation_events', 'final_settlements'].map(t => {
  const rows = db.prepare(`SELECT * FROM ${t} ORDER BY id`).all(); return `${t}:${rows.length}:` + crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 16); }).join('|'));

test('6b. fee-plan override: stored in the database, cleared in the database, automatic plan shown, financial history untouched', async ({ page, request }) => {
  await open(page, request);
  const current = (await (await call(request, 'get', '/fee-plans')).json()).find(x => x.branch_id === branchId && x.sharing === 3 && x.active && !x.effective_until && x.effective_from <= '2026-01-01');
  expect((await call(request, 'put', `/fee-plans/${current.id}`, { name: current.name, advance_amount: current.advance_amount, monthly_fee: current.monthly_fee, additional_charge_label: '', additional_charge_amount: '0', billing_day: current.billing_day, due_day: current.due_day, effective_until: '2026-12-31', active: true })).status()).toBe(200);   // end it so a successor can start in 2027
  const future = await call(request, 'post', '/fee-plans', { branch_id: branchId, name: `Override plan ${stamp}`, sharing: 3, monthly_fee: '9100', advance_amount: '1000', effective_from: '2027-01-01' });
  expect(future.status(), await future.text()).toBe(201); const futureId = (await future.json()).id;
  // give the resident real financial history first: an invoice and a payment
  await call(request, 'post', '/billing/generate', { month: new Date().toISOString().slice(0, 8) + '01' });
  const inv = (await (await call(request, 'get', '/invoices')).json()).find(i => i.resident_id === a.id); expect(inv, 'invoice exists').toBeTruthy();
  expect((await call(request, 'post', '/payments', { invoice_id: inv.id, amount: '1000', method: 'cash', idempotency_key: 'ovr' + stamp + 'abcdef' })).status()).toBe(201);
  const before = financeFingerprint(); expect(before).toContain('invoices:'); expect(inv.amount).toBe('7500.00');

  await find(page, a.name); await menu(page, a.name); await page.getByRole('menuitem', { name: 'Fee plan' }).click();   // 1. assign the override
  await dlg(page).locator('select').selectOption(String(futureId));
  await dlg(page).getByRole('button', { name: 'Save fee plan' }).click(); await expect(dlg(page)).toHaveCount(0);
  expect(storedPlan(a.id)).toBe(futureId);                                                         // 2. the override is really stored
  expect(financeFingerprint()).toBe(before);                                                       //    and no financial record changed

  await menu(page, a.name); await page.getByRole('menuitem', { name: 'Fee plan' }).click();        // 3. clear it
  // note: the API reports the plan in effect today, so a future-dated override is not preselected here; the database check above is what proves it is stored
  await dlg(page).locator('select').selectOption('');
  await dlg(page).getByRole('button', { name: 'Save fee plan' }).click(); await expect(dlg(page)).toHaveCount(0);
  expect(storedPlan(a.id)).toBeNull();                                                              // 4. the database says: no override
  expect(financeFingerprint()).toBe(before);                                                       // 6. invoices, payments, ledger, history identical

  await menu(page, a.name); await page.getByRole('menuitem', { name: 'Fee plan' }).click();        // 5. the automatic plan is what is displayed
  await expect(dlg(page).locator('select')).toHaveValue(''); await expect(dlg(page).locator('.price-panel')).toContainText('Applies automatically');
  await expect(dlg(page).locator('.price-panel')).toContainText('₹7,500.00 / month'); await expect(dlg(page).locator('.price-panel')).not.toContainText('9,100');
  await dlg(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(rowOf(page, a.name)).toContainText('₹7,500.00');
  expect((await getResident(request, a.id)).fee_plan_id).toBe(current.id);                         // the API resolves to the automatic plan again, not to the 2027 plan
  expect(financeFingerprint()).toBe(before);
});

test('7. deactivate needs a reason and is reversible; the confirmation says what happens', async ({ page, request }) => {
  await open(page, request); await find(page, b.name); await menu(page, b.name); await page.getByRole('menuitem', { name: 'Deactivate resident' }).click();
  await expect(dlg(page)).toContainText('disables sign-in'); await dlg(page).getByRole('button', { name: 'Deactivate' }).click();
  await expect(dlg(page)).toBeVisible(); expect((await getResident(request, b.id)).status).toBe('active');       // blocked without a reason
  await dlg(page).getByLabel('Reason').fill('Left the hostel before moving in'); await dlg(page).getByRole('button', { name: 'Deactivate' }).click(); await expect(dlg(page)).toHaveCount(0);
  expect((await getResident(request, b.id)).status).toBe('inactive'); await expect(rowOf(page, b.name)).toContainText('Resident inactive');
  await menu(page, b.name); await expect(page.getByRole('menuitem', { name: 'Reactivate resident' })).not.toHaveClass(/danger/);
  await page.getByRole('menuitem', { name: 'Reactivate resident' }).click(); await dlg(page).getByLabel('Reason').fill('Joining after all'); await dlg(page).getByRole('button', { name: 'Reactivate' }).click();
  await expect(dlg(page)).toHaveCount(0); expect((await getResident(request, b.id)).status).toBe('active');
});

test('8. financial account opens in the large dialog; the advance amount starts at what is still due', async ({ page, request }) => {
  await open(page, request); await find(page, a.name); await menu(page, a.name); await page.getByRole('menuitem', { name: 'Financial account' }).click();
  await expect(dlg(page)).toHaveClass(/dlg-lg/); await expect(dlg(page)).toContainText('Deposit balance'); await expect(dlg(page)).toContainText('Ledger history');
  await expect(dlg(page).getByLabel('Account')).toHaveValue('advance'); await expect(dlg(page).getByLabel(/Amount actually received/)).toHaveValue('8000.00');
  await dlg(page).getByLabel(/Amount actually received/).fill('3000'); await dlg(page).getByRole('button', { name: 'Record ledger entry' }).click();
  await expect(dlg(page)).toContainText('received · advance'); await expect(dlg(page)).toContainText('₹3,000.00');
  const ledger = await (await call(request, 'get', `/residents/${a.id}/financial-ledger`)).json(); expect(ledger.balances.advance).toBe('3000.00'); expect(ledger.advance_remaining).toBe('5000.00');
  await dlg(page).getByRole('button', { name: 'Close', exact: true }).click(); await expect(dlg(page)).toHaveCount(0);
});

const SIZES = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 780 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];
test('@smoke 9. residents at 320, 360, 390, 768 and 1280: no sideways scroll, rows on phones, first resident on the first screen, dialog buttons visible', async ({ page, request }) => {
  await setup(request);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), auth.Authorization.replace('Bearer ', ''));
  await page.goto('/'); await expect(page.locator('nav button').first()).toBeAttached();
  for (const size of SIZES) {
    // The mobile project emulates a phone (touch, mobile viewport rules); widths of 600px and above are covered by the desktop project.
    if (test.info().project.name === 'mobile' && size.width >= 600) continue;
    await page.setViewportSize(size); const tag = `${size.width}x${size.height}`; await page.waitForTimeout(300);   // let the layout settle after the resize
    await page.evaluate(() => [...document.querySelectorAll('nav button')].find(x => x.innerText.trim().startsWith('Residents')).click());
    await expect(page.locator('.ds-page h1')).toHaveText('Residents'); await expect(page.locator('.ds-listrow, .ds-table tbody tr').first()).toBeAttached();
    const g = await page.evaluate(() => { const w = document.querySelector('.ds-table-wrap'), l = document.querySelector('.ds-rows'), first = document.querySelector(innerWidth < 600 ? '.ds-listrow' : '.ds-table tbody tr');
      return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, table: getComputedStyle(w).display !== 'none', rows: getComputedStyle(l).display !== 'none', clip: w.scrollWidth - w.clientWidth, firstTop: first.getBoundingClientRect().top, vh: innerHeight }; });
    if (g.page > 1) console.log('OVERFLOW', tag, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > document.documentElement.clientWidth + 1 && r.width > 0 && !e.closest('.ds-table-wrap'); }).slice(0, 8).map(e => e.tagName + '.' + String(e.className).slice(0, 40) + ':' + Math.round(e.getBoundingClientRect().right)))));
    expect(g.page, tag).toBeLessThanOrEqual(1);
    if (size.width < 600) { expect(g.rows, tag).toBe(true); expect(g.table, tag).toBe(false); expect(g.firstTop, tag).toBeLessThan(g.vh); }         // used to be 1040px down
    else { expect(g.table, tag).toBe(true); if (size.width >= 1280) expect(g.clip, tag).toBeLessThanOrEqual(1); }
    await page.getByRole('button', { name: '+ Add resident' }).click();
    const d = await page.evaluate(() => { const f = document.querySelector('.dlg-foot').getBoundingClientRect(); return { fb: f.bottom, vh: innerHeight, h: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    expect(d.fb, tag).toBeLessThanOrEqual(d.vh + 1); expect(d.h, tag).toBeLessThanOrEqual(1);
    await dlg(page).getByRole('button', { name: 'Cancel' }).click(); await expect(dlg(page)).toHaveCount(0);
  }
});

test('10. a branch administrator sees only their branch; the page typography stays scoped', async ({ page, request }) => {
  await setup(request);
  const branches = await (await call(request, 'get', '/managed-branches')).json();
  const email = `warden${stamp}@example.com`;
  const created = await call(request, 'post', '/branch-admins', { email, temporary_password: 'Warden#Pass2026x', branch_ids: [branchId] }); expect(created.status()).toBe(201);
  const t1 = (await (await request.post(`${API}/auth/login`, { data: { email, password: 'Warden#Pass2026x' } })).json()).access_token;
  await request.post(`${API}/auth/password`, { headers: { Authorization: 'Bearer ' + t1 }, data: { current_password: 'Warden#Pass2026x', new_password: 'Warden#Own2026xy' } });
  const token = (await (await request.post(`${API}/auth/login`, { data: { email, password: 'Warden#Own2026xy' } })).json()).access_token;
  await open(page, request, token);
  await expect(page.locator('.filter-summary')).not.toContainText('of 0');
  const shown = await page.locator('.filter-summary').innerText(); const total = Number(shown.match(/of (\d+)/)[1]);
  const mine = (await (await request.get(`${API}/residents`, { headers: { Authorization: 'Bearer ' + token } })).json());
  expect(total).toBe(mine.length); expect(new Set(mine.map(r => r.branch_id))).toEqual(new Set([branchId]));
  expect(branches.length).toBeGreaterThan(1);                                                                  // other branches exist but are not visible to this administrator
  await page.getByRole('button', { name: '+ Add resident' }).click(); await expect(dlg(page).locator('select[name=branch_id]')).toHaveCount(0);   // single branch: nothing to choose
  await dlg(page).getByRole('button', { name: 'Cancel' }).click();
  const fonts = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('.ds-page h1')).fontFamily, nav: getComputedStyle(document.querySelector('nav button')).fontFamily }));
  expect(fonts.h1).toMatch(/^system-ui/); expect(fonts.nav).not.toMatch(/^system-ui/);
});

import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { API, ownerApi } from './helpers.js';

test.describe.configure({ mode: 'serial' });
const MENS = "Cityhive Luxury Men's PG"; const stamp = Date.now().toString().slice(-6);
const DB_PATH = new URL('../../backend/.e2e/e2e.db', import.meta.url).pathname;
const sql = (query, ...args) => { const db = new DatabaseSync(DB_PATH, { readOnly: true }); try { return db.prepare(query).get(...args); } finally { db.close(); } };
const money = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let auth, branchId, otherBranchId;

const call = (request, method, path, data, headers) => request[method](`${API}${path}`, { headers: headers || auth, data });

// Independent oracle: the same figures straight from the database with SQL, not through the app's own helper.
function truth(branch) {
  const b = branch ? ' AND branch_id = ' + Number(branch) : '';
  const rb = branch ? ' AND r.branch_id = ' + Number(branch) : '';
  const month = new Date().toISOString().slice(0, 7);
  return {
    staying: sql(`SELECT COUNT(*) n FROM residents WHERE status='active' AND room_id IS NOT NULL${b}`).n,
    waiting: sql(`SELECT COUNT(*) n FROM residents WHERE status='active' AND room_id IS NULL${b}`).n,
    capacity: sql(`SELECT COALESCE(SUM(capacity),0) n FROM rooms WHERE active=1${b}`).n,
    occupied: sql(`SELECT COUNT(*) n FROM residents r JOIN rooms m ON m.id=r.room_id WHERE r.status='active' AND m.active=1${branch ? ' AND m.branch_id=' + Number(branch) : ''}`).n,
    outstanding: sql(`SELECT COALESCE(SUM(bal),0) n FROM (SELECT i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id=i.id AND p.reversed_at IS NULL),0) bal FROM invoices i WHERE 1=1${branch ? ' AND i.branch_id=' + Number(branch) : ''}) WHERE bal>0`).n,
    collected: sql(`SELECT COALESCE(SUM(p.amount),0) n FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE p.reversed_at IS NULL AND substr(p.paid_at,1,7)=?${branch ? ' AND i.branch_id=' + Number(branch) : ''}`, month).n,
    admissions: sql(`SELECT COUNT(*) n FROM admissions WHERE status IN ('pending','needs_info')${b}`).n,
    complaints: sql(`SELECT COUNT(*) n FROM complaints c JOIN residents r ON r.id=c.resident_id WHERE c.status!='resolved'${rb}`).n,
  };
}

async function setup(request) {
  auth ||= await ownerApi(request);
  if (branchId) return;
  const branches = await (await call(request, 'get', '/managed-branches')).json();
  branchId = branches.find(b => b.name === MENS).id; otherBranchId = branches.find(b => b.name === 'CityHive CoSpace').id;
  for (const [bid, label] of [[branchId, 'M'], [otherBranchId, 'C']]) await call(request, 'post', '/fee-plans', { branch_id: bid, name: `Dash plan ${label}${stamp}`, sharing: 4, monthly_fee: '7500', advance_amount: '8000', effective_from: '2026-01-01' });
  const rooms = await (await call(request, 'get', '/rooms')).json();
  const free = bid => rooms.filter(r => r.branch_id === bid && r.capacity === 4 && r.occupied === 0 && r.ac && r.active);
  const mk = async (bid, name, room) => { const r = await (await call(request, 'post', '/residents', { branch_id: bid, name, email: `${name.toLowerCase().replace(/\W/g, '')}@example.com`, phone: '9888888888', joined_on: '2026-10-01', temporary_password: 'Temp#Resident9x' })).json();
    if (room) expect((await call(request, 'put', `/residents/${r.id}/allocation`, { room_id: room.id, discount: '0' })).status()).toBe(200); return r.id; };
  const m1 = await mk(branchId, `Dash One ${stamp}`, free(branchId)[0]), m2 = await mk(branchId, `Dash Two ${stamp}`, free(branchId)[1]);
  await mk(branchId, `Dash Waiting ${stamp}`, null); await mk(otherBranchId, `Dash Other ${stamp}`, free(otherBranchId)[0]);
  await call(request, 'post', '/billing/generate', { month: new Date().toISOString().slice(0, 8) + '01' });
  const inv = (await (await call(request, 'get', '/invoices')).json()).find(i => i.resident_id === m1);
  await call(request, 'post', '/payments', { invoice_id: inv.id, amount: '1234.50', method: 'cash', idempotency_key: 'dash' + stamp + 'abcdef' });
  for (const bid of [branchId, otherBranchId]) await call(request, 'put', `/branches/${bid}/publication?published=true`);
  for (const [bid, n] of [[branchId, 'a'], [otherBranchId, 'b']]) expect((await request.post(`${API}/admissions`, { data: { branch_id: bid, name: `Dash Applicant ${n}${stamp}`, email: `dash${n}${stamp}@example.com`, phone: '9111111111', preferred_sharing: 3, move_in_date: '2026-12-01', submission_key: crypto.randomUUID() } })).status()).toBe(201);
  const login = async (email, password) => (await (await request.post(`${API}/auth/login`, { data: { email, password } })).json()).access_token;
  const e1 = `dashone${stamp}@example.com`, t0 = await login(e1, 'Temp#Resident9x');
  await request.post(`${API}/auth/password`, { headers: { Authorization: 'Bearer ' + t0 }, data: { current_password: 'Temp#Resident9x', new_password: 'Resident#Dash2026x' } });
  const rt = { Authorization: 'Bearer ' + await login(e1, 'Resident#Dash2026x') };
  expect((await call(request, 'post', '/complaints', { category: 'maintenance', title: `Dash complaint ${stamp}`, description: 'Leaking tap in the corridor' }, rt)).status()).toBe(201);
  expect((await call(request, 'post', '/my/stay-requests', { request_type: 'extension', requested_move_out: '2027-03-01', note: 'Dash' }, rt)).status()).toBe(201);
  globalThis.__dashResidentToken = rt.Authorization.replace('Bearer ', '');
}
async function openOverview(page, request, token, size) {
  await setup(request);
  if (size) await page.setViewportSize(size);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), token || auth.Authorization.replace('Bearer ', ''));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
  await expect(page.locator('.ds-skel')).toHaveCount(0);
}
const card = (page, label) => page.locator('.ds-stat', { hasText: label });

test('1. every headline figure equals the database, for all branches and per branch', async ({ page, request }) => {
  await openOverview(page, request);
  for (const branch of [null, branchId, otherBranchId]) {
    if (branch) await page.getByLabel('Branch').selectOption(String(branch)); else await page.getByLabel('Branch').selectOption('');
    const t = truth(branch);
    await expect(card(page, 'Residents staying').locator('strong')).toHaveText(String(t.staying));
    await expect(card(page, 'Residents staying')).toContainText(t.waiting ? `${t.waiting} waiting for a room` : 'Everyone has a room');
    await expect(card(page, 'Occupancy').locator('strong')).toHaveText(`${t.occupied} / ${t.capacity}`);
    await expect(card(page, 'Fees outstanding').locator('strong')).toHaveText(money(t.outstanding));
    await expect(card(page, 'Collected this month').locator('strong')).toHaveText(money(t.collected));
    const attention = page.locator('section[aria-label="Needs attention today"]');
    if (t.admissions) await expect(attention.locator('.ds-actionrow', { hasText: 'awaiting a decision' }).locator('.ds-count')).toHaveText(String(t.admissions));
    if (t.complaints) await expect(attention.locator('.ds-actionrow', { hasText: 'open complaint' }).locator('.ds-count')).toHaveText(String(t.complaints));
  }
  expect(truth(branchId).staying + truth(otherBranchId).staying).toBeLessThanOrEqual(truth(null).staying);
});

test('2. each card and action opens a list whose count matches the figure', async ({ page, request }) => {
  await openOverview(page, request);
  const t = truth(null), shown = async () => Number((await page.locator('.filter-summary').first().innerText()).match(/Showing (\d+) of/)[1]);
  await card(page, 'Residents staying').click(); await expect(page.getByRole('heading', { name: 'Residents', level: 1 })).toBeVisible(); expect(await shown()).toBe(t.staying);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Overview')).click());
  await card(page, 'Fees outstanding').click(); await expect(page.getByRole('heading', { name: 'Fees & payments', level: 1 })).toBeVisible();
  await expect(page.locator('.filter-summary')).toContainText('Invoice status: Unpaid');
  const unpaid = sql(`SELECT COUNT(*) n FROM (SELECT i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id=i.id AND p.reversed_at IS NULL),0) bal FROM invoices i) WHERE bal>0`).n; expect(await shown()).toBe(unpaid);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Overview')).click());
  await page.locator('.ds-actionrow', { hasText: 'awaiting a decision' }).getByRole('button', { name: 'Open' }).click(); await expect(page.getByRole('heading', { name: 'Admissions', level: 1 })).toBeVisible(); expect(await shown()).toBe(t.admissions);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Overview')).click());
  await page.locator('.ds-actionrow', { hasText: 'open complaint' }).getByRole('button', { name: 'Open' }).click(); await expect(page.getByRole('heading', { name: 'Complaints', level: 1 })).toBeVisible(); expect(await shown()).toBe(t.complaints);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Overview')).click());
  await page.locator('.ds-actionrow', { hasText: 'waiting for a room' }).getByRole('button', { name: 'Open' }).click(); await expect(page.getByRole('heading', { name: 'Residents', level: 1 })).toBeVisible(); expect(await shown()).toBe(t.waiting);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Overview')).click());
  await card(page, 'Occupancy').click(); await expect(page.getByRole('heading', { name: 'Rooms', level: 1 })).toBeVisible(); await expect(page.locator('.filter-summary')).toContainText('Occupancy: Has vacant beds');
});

test('3. the attention list is useful: reminders from here, stay requests, and only non-zero rows', async ({ page, request }) => {
  await openOverview(page, request);
  const attention = page.locator('section[aria-label="Needs attention today"]');
  await expect(attention.locator('.ds-actionrow', { hasText: 'stay request' })).toContainText('1 stay request to review');
  await expect(attention.locator('.ds-actionrow', { hasText: 'overdue invoice' }).getByRole('button', { name: 'Send reminders' })).toBeVisible();
  for (const row of await attention.locator('.ds-count').allInnerTexts()) expect(Number(row)).toBeGreaterThan(0);
  const reminded = page.waitForResponse(r => r.url().endsWith('/api/reminders/run') && r.request().method() === 'POST');
  await attention.locator('.ds-actionrow', { hasText: 'overdue invoice' }).getByRole('button', { name: 'Send reminders' }).click(); expect((await reminded).status()).toBe(200);
  await expect(page.locator('.alert.success, [role=status]').filter({ hasText: 'Due reminders queued' })).toBeVisible();
});

test('4. recent activity lists the newest events and previews show people, capped at five', async ({ page, request }) => {
  await openOverview(page, request);
  const events = page.locator('section[aria-label="Recent activity"] .ds-listrow'); const n = await events.count(); expect(n).toBeGreaterThan(0); expect(n).toBeLessThanOrEqual(6);
  await expect(events.first()).toContainText(/Complaint|Admission request|Payment/);
  for (const name of ['Fees to follow up', 'Admissions to approve', 'Complaints to handle']) expect(await page.locator(`section[aria-label="${name}"] .ds-listrow`).count()).toBeLessThanOrEqual(5);
  await expect(page.locator('section[aria-label="Fees to follow up"]')).toContainText(`Dash One ${stamp}`);
  expect(await page.locator('main table').count()).toBe(0);                                                  // no oversized tables on the dashboard
});

test('5. a branch with no data shows an honest empty overview', async ({ page, request }) => {
  await setup(request);
  const made = await call(request, 'post', '/branches', { name: `Empty Branch ${stamp}`, address: 'Nowhere', contact_phone: '1234567890' }); expect(made.status()).toBe(201);
  const id = (await made.json()).id;
  await openOverview(page, request); await page.getByLabel('Branch').selectOption(String(id));
  await expect(card(page, 'Residents staying').locator('strong')).toHaveText('0'); await expect(card(page, 'Occupancy').locator('strong')).toHaveText('0 / 0');
  await expect(card(page, 'Fees outstanding')).toContainText('Nothing owed');
  await expect(page.locator('section[aria-label="Needs attention today"]')).toContainText('All clear');
  await expect(page.locator('section[aria-label="Fees to follow up"]')).toContainText('Nothing is owed');
  await expect(page.locator('section[aria-label="Recent activity"]')).toContainText('Nothing has happened yet');
});

test('6. a failed load shows an error with Retry, then recovers', async ({ page, request }) => {
  await setup(request);
  await page.route('**/api/residents', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Simulated outage' }) }));
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), auth.Authorization.replace('Bearer ', ''));
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'The overview could not be loaded' })).toBeVisible();
  await page.unroute('**/api/residents');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(card(page, 'Residents staying')).toBeVisible();
});

test('7. branch administrator sees only their branch; resident gets a personal overview', async ({ page, request }) => {
  await setup(request);
  const email = `dashwarden${stamp}@example.com`;
  expect((await call(request, 'post', '/branch-admins', { email, temporary_password: 'Warden#Pass2026x', branch_ids: [branchId] })).status()).toBe(201);
  const t1 = (await (await request.post(`${API}/auth/login`, { data: { email, password: 'Warden#Pass2026x' } })).json()).access_token;
  await request.post(`${API}/auth/password`, { headers: { Authorization: 'Bearer ' + t1 }, data: { current_password: 'Warden#Pass2026x', new_password: 'Warden#Own2026xy' } });
  const token = (await (await request.post(`${API}/auth/login`, { data: { email, password: 'Warden#Own2026xy' } })).json()).access_token;
  await openOverview(page, request, token);
  const t = truth(branchId);
  await expect(card(page, 'Residents staying').locator('strong')).toHaveText(String(t.staying)); await expect(card(page, 'Occupancy').locator('strong')).toHaveText(`${t.occupied} / ${t.capacity}`);
  await expect(page.getByLabel('Branch').locator('option')).toHaveText(['All branches', MENS]);
  const page2 = await page.context().newPage();
  await page2.addInitScript(tok => sessionStorage.setItem('staywell-token', tok), globalThis.__dashResidentToken); await page2.goto('/');
  await expect(page2.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
  await expect(page2.locator('.ds-stat', { hasText: 'Your room' })).toBeVisible(); await expect(page2.locator('.ds-stat', { hasText: 'Monthly fee' })).toContainText('₹7,500.00');
  await expect(page2.locator('.ds-stat', { hasText: 'Residents staying' })).toHaveCount(0);                   // no staff figures for a resident
  await expect(page2.locator('section[aria-label="Recent payments"]')).toContainText('₹1,234.50');
});

const SIZES = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 780 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];
test('@smoke 8. overview at 320, 360, 390, 768 and 1280: no sideways scroll, sensible columns, first list close to the top', async ({ page, request }) => {
  await openOverview(page, request, undefined, SIZES[4]);
  for (const size of SIZES) {
    if (test.info().project.name === 'mobile' && size.width >= 600) continue;
    await page.setViewportSize(size); await page.waitForTimeout(300); const tag = `${size.width}x${size.height}`;
    const g = await page.evaluate(() => { const cards = [...document.querySelectorAll('.ds-stats[aria-label="Key figures"] .ds-stat')].map(c => c.getBoundingClientRect()), att = document.querySelector('section[aria-label="Needs attention today"]').getBoundingClientRect(),
      act = document.querySelector('section[aria-label="Recent activity"]').getBoundingClientRect(), prev = document.querySelector('section[aria-label="Fees to follow up"]').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, perRow: cards.filter(c => Math.abs(c.top - cards[0].top) < 4).length, side: Math.abs(att.top - act.top) < 4, previewTop: att.top + scrollY, vh: innerHeight }; });
    expect(g.overflow, tag).toBeLessThanOrEqual(1);
    expect(g.perRow, tag).toBe(size.width >= 900 ? 4 : 2);
    expect(g.side, tag).toBe(size.width >= 1100);
    if (size.width < 600) expect(g.previewTop, tag).toBeLessThan(Math.max(g.vh * 1.2, 760));   // the first list (what needs attention) starts within about one screen; the old page put it 1521px down at 360x740
  }
});

test('9. the new typography stays scoped to the page; the sidebar keeps its font', async ({ page, request }) => {
  await openOverview(page, request);
  const f = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('.ds-page h1')).fontFamily, nav: getComputedStyle(document.querySelector('nav button')).fontFamily }));
  expect(f.h1).toMatch(/^system-ui/); expect(f.nav).not.toMatch(/^system-ui/);
});

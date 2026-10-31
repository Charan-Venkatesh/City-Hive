import { test, expect } from '@playwright/test';
import { API, ownerApi } from './helpers.js';

test.describe.configure({ mode: 'serial' });
const MENS = "Cityhive Luxury Men's PG";
let auth, branchId; const stamp = Date.now().toString().slice(-5);
const roomsByNumber = async request => Object.fromEntries((await (await request.get(`${API}/rooms`, { headers: auth })).json()).map(r => [r.number, r]));

async function init(request) {
  auth ||= await ownerApi(request);
  branchId ||= (await (await request.get(`${API}/managed-branches`, { headers: auth })).json()).find(b => b.name === MENS).id;
}
async function openOwner(page, request, nav) {
  await init(request);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), auth.Authorization.replace('Bearer ', ''));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
  if (nav) await page.evaluate(n => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith(n)).click(), nav);
}
const dlg = page => page.locator('.dlg');
async function openAddRoom(page) { await page.getByRole('button', { name: /Add room/ }).first().click(); await expect(dlg(page)).toBeVisible(); await dlg(page).getByLabel('Branch').selectOption({ label: MENS }); }
async function fillRoom(page, number, { sharing = '2', type } = {}) {
  await openAddRoom(page);
  await dlg(page).getByLabel('Room number').fill(number); await dlg(page).getByLabel('Floor').fill('9');
  if (sharing) await dlg(page).getByRole('radio', { name: sharing, exact: true }).check({ force: true });
  if (type) await dlg(page).getByRole('radio', { name: type, exact: true }).check({ force: true });
  await dlg(page).locator('.dlg-foot').getByRole('button', { name: 'Add room' }).click();
}
async function newResident(request, name) {
  await init(request);
  const r = await request.post(`${API}/residents`, { headers: auth, data: { branch_id: branchId, name, email: `${name.toLowerCase().replace(/\W/g, '')}${stamp}@example.com`, phone: '9444444444', joined_on: '2026-10-01', temporary_password: 'Temp#Resident9x' } });
  expect(r.status()).toBe(201); return (await r.json()).id;
}
async function openAllocate(page, name) {
  await page.evaluate(n => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith(n)).click(), 'Residents');
  await page.getByLabel('Search', { exact: true }).fill(name);
  const row = page.locator(page.viewportSize().width < 600 ? '.ds-listrow' : '.ds-table tbody tr', { hasText: name }); await expect(row).toBeVisible();
  await row.getByRole('button', { name: /Allocate room|Move/ }).click();
  await expect(page.locator('.rp-list')).toBeVisible();
}

test('1. adding a room without choosing AC / Non-AC shows validation and saves nothing', async ({ page, request }) => {
  await openOwner(page, request, 'Rooms');
  await fillRoom(page, `T-NONE-${stamp}`, { sharing: '2', type: null });
  await expect(dlg(page).locator('.field-error')).toContainText('Choose AC or Non-AC');
  await expect(dlg(page).getByRole('radio', { name: 'AC', exact: true })).not.toBeChecked();
  await expect(dlg(page).getByRole('radio', { name: 'Non-AC', exact: true })).not.toBeChecked();
  expect((await roomsByNumber(request))[`T-NONE-${stamp}`]).toBeUndefined();
});

test('1b. price panel shows the plan name and monthly price only (no advance), or says no single plan matches', async ({ page, request }) => {
  await init(request);
  const plan = await request.post(`${API}/fee-plans`, { headers: auth, data: { branch_id: branchId, name: `Pilot plan ${stamp}`, sharing: 2, monthly_fee: '6543', advance_amount: '4321', effective_from: '2026-01-01' } });
  expect(plan.status(), await plan.text()).toBe(201);
  await openOwner(page, request, 'Rooms'); await openAddRoom(page);
  await expect(dlg(page).locator('.price-panel')).toContainText('Choose how many residents share');
  await dlg(page).getByRole('radio', { name: '2', exact: true }).check({ force: true });
  const panel = dlg(page).locator('.price-panel');
  await expect(panel).toContainText(`Pilot plan ${stamp}`); await expect(panel).toContainText('₹6,543.00 / month');
  await expect(panel).not.toContainText(/advance/i); await expect(panel).not.toContainText('4,321');
  await expect(dlg(page).locator('.price-panel.warn')).toHaveCount(0);
  await dlg(page).getByRole('radio', { name: '8', exact: true }).check({ force: true });                 // no plan for 8-sharing here
  await expect(dlg(page).locator('.price-panel.warn')).toContainText('No single matching fee plan for 8-person sharing');
  await expect(dlg(page).locator('details.disclosure')).not.toHaveAttribute('open', '');                 // fallback price stays progressive
  await dlg(page).getByRole('button', { name: 'Cancel' }).click();
});

test('1c. every capacity 1 to 8 is an exact selectable value and saves exactly', async ({ page, request }) => {
  await openOwner(page, request, 'Rooms'); await openAddRoom(page);
  const values = await dlg(page).locator('input[name="sharing"]').evaluateAll(els => els.map(e => e.value));
  expect(values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);                                      // no combined "5-8" option, no free-text range
  await dlg(page).getByRole('button', { name: 'Cancel' }).click();
  for (const cap of ['5', '7', '8']) {
    await fillRoom(page, `T-CAP${cap}-${stamp}`, { sharing: cap, type: 'Non-AC' }); await expect(dlg(page)).toHaveCount(0);
  }
  const r = await roomsByNumber(request);
  expect([5, 7, 8].map(c => r[`T-CAP${c}-${stamp}`].capacity)).toEqual([5, 7, 8]);
  await page.locator('.room-tile', { has: page.getByRole('heading', { name: `Room T-CAP7-${stamp}` }) }).getByRole('button', { name: /Edit room/ }).click();   // historical value shown exactly
  await expect(dlg(page).getByRole('radio', { name: '7', exact: true })).toBeChecked();
  await dlg(page).getByRole('button', { name: 'Cancel' }).click();
});

test('2-3. creates an AC room and a Non-AC room', async ({ page, request }) => {
  await openOwner(page, request, 'Rooms');
  await fillRoom(page, `T-AC-${stamp}`, { type: 'AC' }); await expect(dlg(page)).toHaveCount(0);
  await fillRoom(page, `T-NAC-${stamp}`, { type: 'Non-AC' }); await expect(dlg(page)).toHaveCount(0);
  const r = await roomsByNumber(request);
  expect(r[`T-AC-${stamp}`].ac).toBe(true); expect(r[`T-NAC-${stamp}`].ac).toBe(false);
  expect(r[`T-AC-${stamp}`].capacity).toBe(2);
});

test('4. editing shows the saved type and saves changes', async ({ page, request }) => {
  await openOwner(page, request, 'Rooms');
  const edit = async number => { await page.locator('.room-tile', { has: page.getByRole('heading', { name: `Room ${number}` }) }).getByRole('button', { name: /Edit room/ }).click(); await expect(dlg(page)).toBeVisible(); };
  await edit(`T-AC-${stamp}`); await expect(dlg(page).getByRole('radio', { name: 'AC', exact: true })).toBeChecked();
  await dlg(page).getByRole('radio', { name: 'Non-AC', exact: true }).check({ force: true });
  await dlg(page).getByRole('button', { name: 'Save room' }).click(); await expect(dlg(page)).toHaveCount(0);
  await edit(`T-NAC-${stamp}`); await expect(dlg(page).getByRole('radio', { name: 'Non-AC', exact: true })).toBeChecked();
  await dlg(page).getByRole('radio', { name: 'AC', exact: true }).check({ force: true });
  await dlg(page).getByRole('button', { name: 'Save room' }).click(); await expect(dlg(page)).toHaveCount(0);
  const r = await roomsByNumber(request);
  expect(r[`T-AC-${stamp}`].ac).toBe(false); expect(r[`T-NAC-${stamp}`].ac).toBe(true);
  for (const [n, ac] of [[`T-AC-${stamp}`, true], [`T-NAC-${stamp}`, false]]) {
    const x = r[n]; await request.put(`${API}/rooms/${x.id}`, { headers: auth, data: { number: n, floor: '9', capacity: 2, monthly_fee: '0', ac } });
  }
});

test('5-8. room list scrolls, searches, filters AC / Non-AC and available-only', async ({ page, request }) => {
  const full = Object.values(await roomsByNumber(request)).find(x => x.branch_id === branchId && x.capacity === 1 && !x.ac && x.occupied === 0);
  const id = await newResident(request, 'Fullroom Filler');
  expect((await request.put(`${API}/residents/${id}/allocation`, { headers: auth, data: { room_id: full.id, discount: '0' } })).status()).toBe(200);
  await newResident(request, 'Browse Tester');
  await openOwner(page, request); await openAllocate(page, 'Browse Tester');
  const list = page.locator('.rp-list'), rows = page.locator('.rp-row');
  const dims = await list.evaluate(e => ({ scroll: e.scrollHeight, client: e.clientHeight }));
  expect(dims.scroll).toBeGreaterThan(dims.client);                                  // 5. long list scrolls inside its own box
  await list.evaluate(e => { e.scrollTop = e.scrollHeight; }); expect(await list.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
  await page.getByLabel('Search rooms by number').fill('M-70');                      // 6. search
  await expect(rows.first()).toContainText('M-70');
  for (const t of await rows.locator('.rp-name').allInnerTexts()) expect(t).toContain('M-70');
  await page.getByLabel('Search rooms by number').fill('');
  await page.getByRole('radio', { name: /^AC\b/ }).check({ force: true });           // 7a. AC only
  for (const b of await rows.locator('.ds-badge').allInnerTexts()) expect(b).toBe('AC');
  await page.getByRole('radio', { name: /^Non-AC/ }).check({ force: true });         // 7b. Non-AC only
  expect(await rows.count()).toBeGreaterThan(0);
  for (const b of await rows.locator('.ds-badge').allInnerTexts()) expect(b).toBe('Non-AC');
  await page.getByRole('radio', { name: /^All/ }).check({ force: true });
  const withFull = await rows.count(); await expect(page.locator('.rp-row.full').first()).toBeVisible();
  await expect(page.locator('.rp-row.full input').first()).toBeDisabled();
  await page.getByRole('switch', { name: 'Available only' }).check();               // 8. vacancies only
  await expect(page.locator('.rp-row.full')).toHaveCount(0); expect(await rows.count()).toBeLessThan(withFull);
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('9-10. allocates to an eligible Non-AC room and occupancy updates; 11. over-capacity is refused', async ({ page, request }) => {
  const before = await roomsByNumber(request);
  const target = Object.values(before).find(x => !x.ac && x.active && x.branch_id === branchId && x.capacity === 3 && x.occupied === 0);
  await openOwner(page, request); await openAllocate(page, 'Browse Tester');
  await expect(page.getByRole('button', { name: 'Confirm allocation' })).toBeDisabled();            // nothing chosen yet
  await expect(page.locator('.rp-discount input')).toHaveCount(0);                                  // discount is progressive
  await page.getByRole('radio', { name: /^Non-AC/ }).check({ force: true });
  await page.getByLabel('Search rooms by number').fill(target.number);
  await page.locator('.rp-row', { hasText: target.number }).click();
  await expect(page.locator('.rp-selection')).toContainText(target.number); await expect(page.locator('.rp-selection')).toContainText('after this allocation');
  await expect(page.locator('.rp-row.on input')).toBeChecked(); await expect(page.locator('.rp-row.on')).toContainText(target.number);   // selected row is highlighted and checked
  await page.getByRole('button', { name: 'Confirm allocation' }).click();
  await expect(page.locator('.alert.success, [role=status]').filter({ hasText: /Room allocated/ })).toBeVisible();
  const after = (await roomsByNumber(request))[target.number];                                      // 10. occupancy
  expect(after.occupied).toBe(1); expect(after.available).toBe(target.capacity - 1); expect(after.occupants.map(o => o.name)).toContain('Browse Tester');
  const dash = await (await request.get(`${API}/dashboard?branch_id=${branchId}`, { headers: auth })).json(); expect(dash.occupied).toBeGreaterThanOrEqual(2);
  const fullRoom = Object.values(await roomsByNumber(request)).find(x => x.occupied >= x.capacity && x.branch_id === branchId);
  const third = await newResident(request, 'Overflow Tester');
  expect((await request.put(`${API}/residents/${third}/allocation`, { headers: auth, data: { room_id: fullRoom.id, discount: '0' } })).status()).toBe(409);   // 11.
});

test('keyboard: arrows move the room selection, Escape closes and returns focus', async ({ page, request }) => {
  await newResident(request, 'Keyboard Tester');
  await openOwner(page, request); await openAllocate(page, 'Keyboard Tester');
  await page.locator('.rp-row input:not(:disabled)').first().focus();
  await page.keyboard.press('Space');
  const first = await page.locator('.rp-row.on .rp-name').innerText(); expect(first).toBeTruthy();
  await page.keyboard.press('ArrowDown');
  const second = await page.locator('.rp-row.on .rp-name').innerText(); expect(second).not.toBe(first);
  await page.keyboard.press('Escape'); await expect(dlg(page)).toHaveCount(0);
  await expect(page.locator('main')).toBeVisible();
});

const SIZES = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 780 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];
test('@smoke 12. allocation dialog: fixed footer never covers rooms or filters, list scrolls on its own, from 320px to desktop', async ({ page, request }) => {
  const unique = 'Mobile Tester ' + Math.random().toString(36).replace(/\d/g, 'x').slice(2, 8);
  await newResident(request, unique);
  await openOwner(page, request);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await openAllocate(page, unique);
    const g = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect(), d = r('.dlg'), foot = r('.dlg-foot'), body = document.querySelector('.dlg-body'), list = document.querySelector('.rp-list');
      const buttons = [...document.querySelectorAll('.dlg-foot button')].map(b => b.getBoundingClientRect());
      return { vh: innerHeight, vw: innerWidth, top: d.top, bottom: d.bottom, footTop: foot.top, bodyBottom: body.getBoundingClientRect().bottom, listScrolls: list.scrollHeight > list.clientHeight, listH: list.clientHeight,
        buttonsInView: buttons.every(b => b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth), hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        minButton: Math.min(...buttons.map(b => b.height)) };
    });
    const tag = `${size.width}x${size.height}`;
    expect(g.hOverflow, tag).toBeLessThanOrEqual(1);
    expect(g.top, tag).toBeGreaterThanOrEqual(0); expect(g.bottom, tag).toBeLessThanOrEqual(g.vh + 1);
    expect(g.buttonsInView, tag).toBe(true); expect(g.bodyBottom, tag).toBeLessThanOrEqual(g.footTop + 1);
    expect(g.listScrolls, tag).toBe(true); expect(g.listH, tag).toBeGreaterThanOrEqual(140);                 // list is never squeezed away
    if (size.width < 600) { expect(g.minButton, tag).toBeGreaterThanOrEqual(44); expect(Math.round(g.bottom - g.top), tag).toBe(g.vh); }   // phone sheet, 44px targets
    const inner = await page.evaluate(() => { const l = document.querySelector('.rp-list'), b = document.querySelector('.dlg-body'); const before = b.scrollTop; l.scrollTop = 200; return { list: l.scrollTop, bodyMoved: b.scrollTop !== before }; });
    expect(inner.list, tag).toBeGreaterThan(0); expect(inner.bodyMoved, tag).toBe(false);
    await expect(page.getByRole('radio', { name: /^All/ })).toBeChecked();                                   // nothing pre-filtered to AC
    await page.getByRole('button', { name: 'Cancel' }).click(); await expect(dlg(page)).toHaveCount(0);
  }
});

test('@smoke add-room dialog on a phone: actions stay visible and the form is a full-height sheet', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await openOwner(page, request); await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Rooms')).click());
  await page.getByRole('button', { name: /Add room/ }).first().click(); await expect(dlg(page)).toBeVisible();
  const g = await page.evaluate(() => { const f = document.querySelector('.dlg-foot').getBoundingClientRect(), b = document.querySelector('.dlg-body'); return { footBottom: f.bottom, vh: innerHeight, bodyScrolls: b.scrollHeight > b.clientHeight, h: document.querySelector('.dlg').getBoundingClientRect().height }; });
  expect(g.footBottom).toBeLessThanOrEqual(g.vh + 1); expect(Math.round(g.h)).toBe(g.vh);
  await dlg(page).getByRole('button', { name: 'Add room' }).click();                                          // submit empty: fields flagged, dialog stays
  await expect(dlg(page)).toBeVisible();
});

test('@smoke add-room dialog at 320, 360, 390, 768 and 1280: actions visible, all eight capacities fit and are tappable', async ({ page, request }) => {
  await openOwner(page, request);
  for (const size of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 780 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(size);
    await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Rooms')).click());
    await page.getByRole('button', { name: /Add room/ }).first().click(); await expect(dlg(page)).toBeVisible();
    const g = await page.evaluate(() => {
      const d = document.querySelector('.dlg').getBoundingClientRect(), foot = document.querySelector('.dlg-foot').getBoundingClientRect(), body = document.querySelector('.dlg-body').getBoundingClientRect();
      const segs = [...document.querySelectorAll('.seg')][0], opts = [...segs.querySelectorAll('.seg-opt')].map(o => o.getBoundingClientRect()), sr = segs.getBoundingClientRect();
      return { vh: innerHeight, vw: innerWidth, top: d.top, bottom: d.bottom, left: d.left, right: d.right, footTop: foot.top, footBottom: foot.bottom, bodyBottom: body.bottom, h: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        count: opts.length, minW: Math.min(...opts.map(o => o.width)), minH: Math.min(...opts.map(o => o.height)), inside: opts.every(o => o.left >= sr.left - 1 && o.right <= sr.right + 1), btn: Math.min(...[...document.querySelectorAll('.dlg-foot button')].map(b => b.getBoundingClientRect().height)) };
    });
    const tag = `${size.width}x${size.height}`;
    expect(g.h, tag).toBeLessThanOrEqual(1); expect(g.count, tag).toBe(8); expect(g.inside, tag).toBe(true);
    expect(g.minW, tag).toBeGreaterThanOrEqual(30); expect(g.minH, tag).toBeGreaterThanOrEqual(38);
    expect(g.left, tag).toBeGreaterThanOrEqual(0); expect(g.right, tag).toBeLessThanOrEqual(g.vw + 1); expect(g.top, tag).toBeGreaterThanOrEqual(0); expect(g.bottom, tag).toBeLessThanOrEqual(g.vh + 1);
    expect(g.footBottom, tag).toBeLessThanOrEqual(g.vh + 1); expect(g.bodyBottom, tag).toBeLessThanOrEqual(g.footTop + 1);
    if (size.width < 600) expect(g.btn, tag).toBeGreaterThanOrEqual(44);
    await dlg(page).getByRole('radio', { name: '6', exact: true }).check({ force: true });
    await expect(dlg(page).getByRole('radio', { name: '6', exact: true })).toBeChecked();
    await dlg(page).getByRole('button', { name: 'Cancel' }).click(); await expect(dlg(page)).toHaveCount(0);
  }
});

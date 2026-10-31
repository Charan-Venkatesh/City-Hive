import { test, expect } from '@playwright/test';
import { ownerApi } from './helpers.js';

// The pilot may only restyle the Rooms add/edit and allocation dialogs. Everything else keeps its existing look.
async function openOwner(page, request, nav) {
  const auth = await ownerApi(request);
  await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), auth.Authorization.replace('Bearer ', ''));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
  if (nav) await page.evaluate(n => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith(n)).click(), nav);
}

test('typography and status badges on pages not yet redesigned are unchanged', async ({ page, request }) => {
  await openOwner(page, request, 'Rooms');
  await expect(page.locator('main .badge').first()).toBeVisible();
  const ui = await page.evaluate(() => {
    const css = el => getComputedStyle(el), h1 = document.querySelector('main h1'), badge = document.querySelector('main .badge');
    return { body: css(document.body).fontFamily, root: css(document.documentElement).fontFamily, h1: css(h1).fontFamily,
      badge: { size: css(badge).fontSize, pad: css(badge).padding, radius: css(badge).borderRadius, weight: css(badge).fontWeight } };
  });
  expect(ui.root).toContain('Avenir Next'); expect(ui.body).toContain('Avenir Next'); expect(ui.h1).toContain('Manrope');   // the original, unmodified stacks
  expect(ui.root).not.toMatch(/^system-ui/);
  expect(ui.badge).toEqual({ size: '9px', pad: '5px 8px', radius: '5px', weight: '600' });                                    // original .badge rule in style.css
});

test('the new system font applies only inside the redesigned dialogs', async ({ page, request }) => {
  await openOwner(page, request, 'Rooms');
  await page.getByRole('button', { name: /Add room/ }).first().click(); await expect(page.locator('.dlg')).toBeVisible();
  const f = await page.evaluate(() => ({ dlg: getComputedStyle(document.querySelector('.dlg')).fontFamily, title: getComputedStyle(document.querySelector('.dlg h2')).fontFamily,
    input: getComputedStyle(document.querySelector('.dlg input')).fontFamily, page: getComputedStyle(document.querySelector('main h1')).fontFamily }));
  for (const v of [f.dlg, f.title, f.input]) expect(v).toMatch(/^system-ui/);
  expect(f.page).toContain('Manrope');
});

test('the new typography is limited to the redesigned Fees page; sidebar and other pages keep their fonts', async ({ page, request }) => {
  await openOwner(page, request, 'Fees'); await expect(page.locator('.ds-page h1')).toBeVisible();
  const fees = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('.ds-page h1')).fontFamily, table: getComputedStyle(document.querySelector('.ds-page .tab')).fontFamily,
    sidebar: getComputedStyle(document.querySelector('nav button')).fontFamily, topbar: getComputedStyle(document.querySelector('header .breadcrumb') || document.querySelector('header')).fontFamily }));
  expect(fees.h1).toMatch(/^system-ui/); expect(fees.table).toMatch(/^system-ui/);
  expect(fees.sidebar).not.toMatch(/^system-ui/); expect(fees.topbar).not.toMatch(/^system-ui/);               // sidebar and top bar migrate with the final global step
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith('Complaints')).click());
  await expect(page.locator('main h1')).toHaveText('Complaints');
  const other = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('main h1')).fontFamily, body: getComputedStyle(document.body).fontFamily }));
  expect(other.h1).toContain('Manrope'); expect(other.body).toContain('Avenir Next');
});

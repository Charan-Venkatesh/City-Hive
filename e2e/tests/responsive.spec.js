import { test, expect } from '@playwright/test';
import { API, OWNER, ownerApi } from './helpers.js';

const sizes = [{ name: 'phone', width: 375, height: 812 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'laptop', width: 1280, height: 800 }];
const pages = ['Overview', 'Branches', 'Branch admins', 'Admissions', 'Stay requests', 'Residents', 'Rooms', 'Fees & payments',
  'Financial analytics', 'Complaints', 'Gate passes', 'Message activity', 'Account'];

async function overflow(page) {
  return page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    wide: [...document.querySelectorAll('main *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.table-scroll, .ds-table-wrap'); })
      .slice(0, 3).map(e => e.tagName + '.' + e.className) }));
}

test.describe('responsive layout', () => {
  for (const size of sizes) {
    test(`public site has no horizontal overflow on ${size.name}`, async ({ page }) => {
      await page.setViewportSize(size); await page.goto('/');
      await expect(page.locator('.ch-facts')).toBeVisible();
      expect((await overflow(page)).doc).toBeLessThanOrEqual(1);
    });
    test(`management pages have no overflow on ${size.name}`, async ({ page, request }) => {
      const auth = await ownerApi(request); const token = auth.Authorization.replace('Bearer ', '');
      await page.setViewportSize(size);
      await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), token);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
      const problems = [];
      for (const name of pages) {
        await page.evaluate(n => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith(n))?.click(), name);
        await page.waitForTimeout(350);
        const o = await overflow(page);
        if (o.doc > 1 || o.wide.length) problems.push(`${name}: doc=${o.doc} ${o.wide.join(',')}`);
      }
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});

test.describe('keyboard and accessibility', () => {
  test('skip link and focus ring are reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), visible: document.activeElement.getBoundingClientRect().top >= 0 }));
    expect(first.text).toMatch(/Skip to content/i); expect(first.visible).toBe(true);
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' || s.boxShadow !== 'none'; });
    expect(outline).toBe(true);
  });
  test('sign-in form is operable by keyboard and errors are announced', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Management sign in' }).first().focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Email or username').fill('admin');
    await page.keyboard.press('Tab'); await page.keyboard.type('wrong-password'); await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText(/Incorrect email or password/);
  });
  test('every management table scroll region is keyboard focusable and inputs are labelled', async ({ page, request }) => {
    const auth = await ownerApi(request); const token = auth.Authorization.replace('Bearer ', '');
    await page.addInitScript(t => sessionStorage.setItem('staywell-token', t), token);
    await page.goto('/'); await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    const issues = [];
    for (const name of pages) {
      await page.evaluate(n => [...document.querySelectorAll('nav button')].find(b => b.innerText.trim().startsWith(n))?.click(), name);
      await page.waitForTimeout(300);
      // (buttons inside a closed <details> menu are not rendered, so they are not counted)
      const r = await page.evaluate(() => ({
        regions: [...document.querySelectorAll('.table-scroll')].filter(e => e.tabIndex < 0 || !e.getAttribute('aria-label')).length,
        unlabelled: [...document.querySelectorAll('main input:not([type=hidden]), main select, main textarea')].filter(e => !e.labels?.length && !e.getAttribute('aria-label') && !e.closest('label')).length,
        iconButtons: [...document.querySelectorAll('main button')].filter(b => !b.closest('details:not([open])') && !b.innerText.trim() && !b.getAttribute('aria-label') && !b.title).length }));
      if (r.regions || r.unlabelled || r.iconButtons) issues.push(`${name}: ${JSON.stringify(r)}`);
    }
    expect(issues, issues.join('\n')).toEqual([]);
  });
});

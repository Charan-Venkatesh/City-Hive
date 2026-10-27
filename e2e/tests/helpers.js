import fs from 'node:fs';
export const API = 'http://127.0.0.1:8100/api';
export const OTP_LOG = new URL('../../backend/.e2e/otp.log', import.meta.url).pathname;
export const OWNER = { email: 'admin', password: 'E2e-Owner-Pass-1' };

export function latestCode() {
  const lines = fs.readFileSync(OTP_LOG, 'utf8').trim().split('\n');
  return lines.at(-1).match(/code=(\d{6})/)[1];
}

export async function waitForNewCode(previous) {
  for (let i = 0; i < 50; i++) {
    try { const c = latestCode(); if (c !== previous) return c; } catch { /* log not created yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('No sign-in code was delivered');
}

const lastRequest = new Map();
// The backend allows one code per account every OTP_RESEND_SECONDS (30 in tests); wait out the window.
export async function respectResendWindow(email) {
  const wait = (lastRequest.get(email) || 0) + 31000 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest.set(email, Date.now());
}

let ownerToken;
export async function ownerApi(request) {
  ownerToken ||= await apiLogin(request, OWNER);
  return { Authorization: `Bearer ${ownerToken}` };
}

export function currentCode() { try { return latestCode(); } catch { return null; } }

export async function apiLogin(request, creds) {
  const res = await request.post(`${API}/auth/login`, { data: creds });
  if (!res.ok()) throw new Error(`login ${res.status()} ${await res.text()}`);
  return (await res.json()).access_token;
}

export async function uiLogin(page, creds, openButton) {
  await page.goto('/');
  await page.getByRole('button', { name: openButton }).first().click();
  await page.getByLabel('Email or username').fill(creds.email);
  await page.getByLabel('Password', { exact: true }).fill(creds.password);
  await page.getByRole('button', { name: 'Continue securely' }).click();
}

#!/usr/bin/env node
/** LOCAL GUI ONLY: non-browser readiness smoke. No writes or remote requests. */
import WebSocket from 'ws';
const appPort = Number(process.env.LOCAL_GUI_APP_PORT || 5190);
const apiPort = Number(process.env.LOCAL_GUI_API_PORT || 8790);
const app = `http://127.0.0.1:${appPort}`;
const base = `http://127.0.0.1:${apiPort}`;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function token(uid, email) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'LOCAL_GUI_ONLY', typ: 'JWT' })}.${encode({ sub: uid, email, email_verified: true,
    aud: 'store-local-gui-fake', iat: now, auth_time: now, exp: now + 3600 })}.local-gui-not-a-real-signature`;
}
async function get(path, bearer) {
  const response = await fetch(`${base}${path}`, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
  assert(response.ok, `${path} returned ${response.status}`);
  return response.json();
}
const store = await get('/api/public/store/local-gui-shop');
assert(store.isAnnualPlan && store.name === 'متجر تجريبي محلي', 'Expected fictitious annual store');
assert((await get('/api/public/store/local-gui-shop/products')).length === 2, 'Expected two local products');
assert((await get('/api/public/store/local-gui-shop/payment-methods')).length === 1, 'Expected one local payment');
for (const [uid, email, expected] of [
  ['local-gui-owner', 'owner@example.test', 'annual'],
  ['local-gui-fresh', 'fresh@example.test', null],
  ['local-gui-expired', 'expired@example.test', 'trial'],
]) {
  const profile = await get('/api/admin/profile', token(uid, email));
  assert(expected === null ? profile === null : profile?.planId === expected, `Invalid profile fixture for ${email}`);
}
assert((await fetch(`${base}/api/admin/profile`, { headers: { Authorization: 'Bearer invalid' } })).status === 401, 'Invalid local token accepted');
const snapshot = await new Promise((resolve, reject) => {
  const socket = new WebSocket(`ws://127.0.0.1:${apiPort}/api/public/store/local-gui-shop/realtime`);
  const timer = setTimeout(() => { socket.terminate(); reject(new Error('Realtime snapshot timeout')); }, 5000);
  socket.once('error', error => { clearTimeout(timer); reject(error); });
  socket.once('message', bytes => { clearTimeout(timer); socket.close(); resolve(JSON.parse(String(bytes))); });
});
assert(snapshot.type === 'snapshot' && snapshot.storeId === 'local-gui-shop', 'Invalid DO snapshot');
const cssResponse = await fetch(`${app}/src/index.css`);
assert(cssResponse.ok, `App CSS failed to transform: ${cssResponse.status}`);
const cssModule = await cssResponse.text();
const cssAssignment = cssModule.match(/const __vite__css = ("(?:[^"\\]|\\.)*")/);
assert(cssAssignment, 'Unable to inspect transformed CSS module');
const css = JSON.parse(cssAssignment[1]);
for (const utility of ['.flex {', '.grid {', '.bg-card {', '.p-4 {', '.lg\\:hidden {']) {
  assert(css.includes(utility), `Missing generated Tailwind utility: ${utility}`);
}
const html = await (await fetch(`${app}/`)).text();
assert(html.includes('/scripts/local-gui/bootstrap.local-gui.ts'), 'Missing local App bootstrap');
assert(!html.includes('<link rel="preconnect"'), 'Production preconnect survived local HTML transform');
const auth = await (await fetch(`${app}/src/contexts/AuthContext.tsx`)).text();
assert(auth.includes('/scripts/local-gui/firebase-auth.local-gui.ts') && auth.includes('/scripts/local-gui/firebase-config.local-gui.ts'), 'Firebase aliases missing');
console.log('LOCAL GUI readiness passed: actual annual store/products/payment/profile API, invalid token rejection, SQLite DO WebSocket snapshot and real App fake Firebase aliases. No fixture mutations.');

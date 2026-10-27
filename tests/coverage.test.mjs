// Teste v2.2.0: acoperirea monitorizării (cât timp a fost fila deschisă) afișată în istoricul de funcționare.
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const NOW = new Date('2026-10-14T10:00:00Z').getTime(), D = 86400000, H = 3600000;
const STATE = {
  sites: [{id: 'a1', name: 'Mail', url: 'https://mail.example.org/', category: 'Infra', subcategory: '', server: '', notes: '', addedAt: NOW - 40 * D, lastVerdict: 'up', lastLatency: 100, lastCheckedAt: NOW - 60000,
    episodes: [{startedAt: NOW - 2 * D, endedAt: NOW - 2 * D + 30 * 60000, note: ''}, {startedAt: NOW - 9 * D, endedAt: NOW - 9 * D + 10 * H, note: ''}]}],
  history: {}, settings: {autoRefreshMs: 0}, lastActiveAt: NOW - 60000, appliedSeedSets: ['all']
};
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
async function open(state, lang) {
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}, locale: lang || 'en-US', timezoneId: 'UTC'});
  await ctx.route(/^https?:/, (r) => r.abort());
  const page = await ctx.newPage(); const errs = [];
  await page.clock.install({time: NOW});
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript((a) => { if (!localStorage.getItem('outpost_state_v1') && a.s) localStorage.setItem('outpost_state_v1', JSON.stringify(a.s)); }, {s: state});
  await page.addInitScript(() => { window.__beeps = 0; const A = window.AudioContext || window.webkitAudioContext; if (A) { const o = A.prototype.createOscillator; A.prototype.createOscillator = function () { window.__beeps++; return o.call(this); }; } });
  await page.goto(FILE); await page.waitForTimeout(500);
  return {ctx, page, errs};
}

async function openW(state, watch, lang) {
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}, locale: lang || 'en-US', timezoneId: 'UTC'});
  await ctx.route(/^https?:/, (r) => r.abort());
  const page = await ctx.newPage(); const errs = [];
  await page.clock.install({time: NOW});
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript((a) => { if (!localStorage.getItem('outpost_state_v1')) localStorage.setItem('outpost_state_v1', JSON.stringify(a.s)); if (a.w && !localStorage.getItem('outpost_watch_v1')) localStorage.setItem('outpost_watch_v1', JSON.stringify(a.w)); }, {s: state, w: watch});
  await page.goto(FILE); await page.waitForTimeout(500);
  return {ctx, page, errs};
}
{
  console.log('Acoperire calculată din intervale');
  const W = {since: NOW - 10 * D, iv: [[NOW - 10 * D, NOW - 5 * D], [NOW - 3 * D, NOW - 1 * D]]};
  const {ctx, page, errs} = await openW(STATE, W, 'en-US');
  const txt = await page.locator('.station .uptime-hist .hist-cov').textContent();
  check('7 zile din 10 = 70%', /70%/.test(txt) && /2026-10-04/.test(txt), txt);
  check('textul avertizează că procentele pot fi supraestimate', /overstated/.test(txt));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost_watch_v1')));
  check('pulsul la pornire a adăugat un interval nou (golul > 5 min)', stored.iv.length === 3 && Math.abs(stored.iv[2][0] - NOW) < 5000, stored.iv.length);
  await page.clock.runFor(4 * 60000);
  const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost_watch_v1')));
  check('după 4 minute intervalul curent s-a extins (aceeași înregistrare)', st2.iv.length === 3 && st2.iv[2][1] >= NOW + 3 * 60000, st2.iv[2]);
  await page.clock.runFor(30 * 60000);
  const st3 = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost_watch_v1')));
  check('încă ~30 de minute: tot un singur interval continuu', st3.iv.length === 3 && st3.iv[2][1] >= NOW + 30 * 60000, st3.iv[2]);
  check('fără erori JS', errs.length === 0, errs);
  await ctx.close();
}
{
  console.log('Fără date de acoperire sau prea puțin timp');
  const {ctx, page} = await openW(STATE, null, 'en-US');
  check('prima pornire: nicio linie de acoperire (numărătoarea abia începe)', (await page.locator('.station .uptime-hist .hist-cov').count()) === 0);
  const w = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost_watch_v1')));
  check('prima pornire creează cheia cu since = acum', w && Math.abs(w.since - NOW) < 5000 && w.iv.length === 1, w);
  await ctx.close();
}
{
  console.log('Date invalide în cheia de acoperire');
  const {ctx, page, errs} = await openW(STATE, {since: 'x', iv: [[5, 1], 'a', [NOW - D, NOW - D / 2]]}, 'en-US');
  check('intervalele invalide sunt ignorate, aplicația pornește', errs.length === 0 && (await page.locator('.station').count()) === 1, errs);
  await ctx.close();
}
for (const [lang, probe] of [['ro-RO', /Fila a fost deschisă 70%/], ['fr-FR', /Onglet ouvert : 70 %/], ['de-DE', /Tab geöffnet: 70 %/], ['hu-HU', /70%-a/], ['it-IT', /Scheda aperta: 70%/], ['es-ES', /Pestaña abierta: 70 %/], ['pt-PT', /Separador aberto: 70%/]]) {
  const W = {since: NOW - 10 * D, iv: [[NOW - 10 * D, NOW - 5 * D], [NOW - 3 * D, NOW - 1 * D]]};
  const {ctx, page} = await openW(STATE, W, lang);
  check(lang + ': linia de acoperire este tradusă', probe.test(await page.locator('.station .uptime-hist .hist-cov').textContent()));
  await ctx.close();
}
await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);

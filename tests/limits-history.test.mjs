// Teste v2.1.0: panou „Limitele monitorizării din browser”, test de sunet, istoric de funcționare pe 30 de zile.
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
  await page.addInitScript((s) => { if (!localStorage.getItem('outpost_state_v1') && s) localStorage.setItem('outpost_state_v1', JSON.stringify(s)); }, state);
  await page.addInitScript(() => { window.__beeps = 0; const A = window.AudioContext || window.webkitAudioContext; if (A) { const o = A.prototype.createOscillator; A.prototype.createOscillator = function () { window.__beeps++; return o.call(this); }; } });
  await page.goto(FILE); await page.waitForTimeout(500);
  return {ctx, page, errs};
}
{
  console.log('Lista goală');
  const {ctx, page, errs} = await open(null, 'en-US');
  check('panoul de limite este deschis când lista e goală', await page.locator('#limitsPanel').evaluate((e) => e.open));
  const txt = await page.locator('#limitsPanel').innerText();
  check('spune explicit „doar cât fila e deschisă”', /only while this tab stays open/i.test(txt));
  check('spune explicit despre CORS / no-cors', /CORS/.test(txt) && /no-cors/.test(txt));
  check('avertizează că procentele pot supraestima', /overstate/i.test(txt));
  check('nota despre ascultarea automată e ascunsă când e oprită', await page.locator('#autoNote').isHidden());
  await page.selectOption('#autoRefreshSelect', '60000');
  check('nota apare când ascultarea automată e pornită', await page.locator('#autoNote').isVisible());
  await page.click('#soundTestBtn'); await page.clock.runFor(1000);
  check('„Test sunet” redă două tonuri', await page.evaluate(() => window.__beeps) === 2, await page.evaluate(() => window.__beeps));
  check('fără erori JS', errs.length === 0, errs);
  await ctx.close();
}
{
  console.log('Cu stații');
  const {ctx, page, errs} = await open(STATE, 'en-US');
  check('panoul de limite este închis când există stații', await page.locator('#limitsPanel').evaluate((e) => !e.open));
  const bars = await page.locator('.station .uptime-hist .hbars .b').count();
  check('30 de bare zilnice', bars === 30, bars);
  const cls = await page.locator('.station .uptime-hist .hbars .b').evaluateAll((els) => els.map((e) => e.className.replace('b ', '')));
  check('ultimele 30 de zile: ziua cu 30 min de pauză e ambră, cea cu 10 h e roșie', cls[27] === 'warn' && cls[20] === 'bad', cls.join(','));
  check('zilele fără pauze sunt verzi', cls[29] === 'ok' && cls[10] === 'ok', cls.join(','));
  const sum = await page.locator('.station .uptime-hist summary').innerText();
  check('rezumatul arată procentul pe 30 de zile', /\d+\.\d\d%/.test(sum), sum);
  await page.locator('.station .uptime-hist summary').click();
  await page.waitForTimeout(100);
  check('starea deschisă a istoricului se păstrează la re-randare', await page.locator('.station .uptime-hist').evaluate((e) => e.open));
  await page.click('#checkAllBtn'); await page.waitForTimeout(300);
  check('...și după „Listen now”', await page.locator('.station .uptime-hist').evaluate((e) => e.open));
  check('fără erori JS', errs.length === 0, errs);
  await ctx.close();
}
for (const [lang, probe] of [['ro-RO', /fila rămâne deschisă/], ['fr-FR', /onglet reste ouvert/], ['de-DE', /Tab geöffnet bleibt/], ['hu-HU', /lap nyitva marad/], ['it-IT', /scheda resta aperta/], ['es-ES', /pestaña siga abierta/], ['pt-PT', /separador permanecer aberto/]]) {
  const {ctx, page} = await open(null, lang);
  check(lang + ': panoul de limite este tradus', probe.test(await page.locator('#limitsPanel').innerText()));
  await ctx.close();
}
await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);

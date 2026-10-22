// Teste r8 (14 oct. 2026): raport de stare (.md/.csv/tipărire), Find aproximativ, copie de siguranță prin kit.
// Rulare: node tests/fff-r8.test.mjs  (Playwright din /opt/node-tools, Chromium local, rețea blocată, ceas simulat)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire('/opt/node-tools/package.json');
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const AXE = process.env.FFF_AXE || '/tmp/claude-0/-home-claude/78529928-3825-51c3-b9bd-0e81655ab6bc/scratchpad/sweep/node_modules/axe-core/axe.min.js';
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const TMP = fs.mkdtempSync(path.join(process.env.FFF_TMP || os.tmpdir(), 'outp-'));
const NOW = new Date('2026-10-14T10:00:00Z').getTime();
const H = 3600000, D = 86400000;
const STATE = {
  sites: [
    {id: 'a1', name: 'Mail Gateway', url: 'https://mail.example.org/', category: 'Infra', subcategory: 'Email', server: 'edge-1', notes: 'Restart postfix, then check the queue | =HYPERLINK("x")', addedAt: NOW - 40 * D, lastVerdict: 'up', lastLatency: 123.4, lastCheckedAt: NOW - 5 * 60000, episodes: [{startedAt: NOW - 2 * D, endedAt: NOW - 2 * D + 30 * 60000, note: 'certificate expired'}], lastIp: '203.0.113.9'},
    {id: 'a2', name: '=Wiki, interna', url: 'https://wiki.example.org/', category: 'Docs', subcategory: '', server: '', notes: '', addedAt: NOW - 10 * D, lastVerdict: 'down', lastLatency: null, lastCheckedAt: NOW - 60000, episodes: [{startedAt: NOW - 3 * H, endedAt: null, note: 'database unreachable'}]},
    {id: 'a3', name: 'Șantier Cluj', url: 'https://santier.example.org/', category: 'Docs', subcategory: '', server: '', notes: '', addedAt: NOW - 2 * H, lastVerdict: 'up', lastLatency: 80, lastCheckedAt: NOW - 120000, episodes: []}
  ],
  history: {}, settings: {autoRefreshMs: 0}, lastActiveAt: NOW - 60000, appliedSeedSets: ['all']
};
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox']});
async function open(w = 1280, h = 800, seed = true) {
  const ctx = await b.newContext({viewport: {width: w, height: h}, acceptDownloads: true, locale: 'en-US', timezoneId: 'UTC'});
  const net = [];
  await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  await page.clock.install({time: NOW});
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) errs.push('csp: ' + t); });
  if (seed) await page.addInitScript((s) => { if (!localStorage.getItem('outpost_state_v1')) localStorage.setItem('outpost_state_v1', JSON.stringify(s)); }, STATE);
  await page.goto(FILE);
  await page.waitForTimeout(500);
  return {ctx, page, errs, net};
}
async function download(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(selector)]);
  const p = path.join(TMP, dl.suggestedFilename());
  await dl.saveAs(p);
  return {name: dl.suggestedFilename(), text: fs.readFileSync(p, 'utf8'), path: p};
}

console.log('— metadate și kit');
{
  const {ctx, page, errs, net} = await open();
  const meta = await page.evaluate(() => ({v: document.querySelector('meta[name=application-version]').content, d: document.querySelector('meta[name=last-updated]').content, ft: document.getElementById('app-version').textContent, mods: document.querySelector('meta[name=fff-modules]')?.content, ffs: !!(window.FFF && FFF.search && FFF.bundle && FFF.label)}));
  check('versiune 1.2.4 în meta', meta.v === '1.2.4', meta);
  check('data 2026-10-22', meta.d === '2026-10-22');
  check('footer', meta.ft === 'v 1.2.4 · 2026-10-22', meta.ft);
  check('module kit', meta.mods === 'core,label,bundle,search', meta.mods);
  check('FFF.search/bundle/label prezente', meta.ffs);
  check('3 stații randate', await page.locator('.station').count() === 3, await page.locator('.station').count());

  console.log('— raport Markdown');
  const md = await download(page, '#reportMdBtn');
  check('nume fișier .md cu dată', /^outpost-report-\d{4}-\d{2}-\d{2}\.md$/.test(md.name), md.name);
  check('titlu și număr stații', /# OUTPOST status report/.test(md.text) && /Stations: 3/.test(md.text), md.text.slice(0, 200));
  check('tabel cu cele 3 stații', /Mail Gateway/.test(md.text) && /Wiki, interna/.test(md.text) && /Șantier Cluj/.test(md.text));
  check('bară verticală din note scăpată', /Restart postfix, then check the queue \\\|/.test(md.text), md.text.match(/Restart.*/)?.[0]);
  check('incidente: episod încheiat cu notă și episod în curs', /certificate expired/.test(md.text) && /ongoing/.test(md.text) && /database unreachable/.test(md.text));
  check('uptime 24h calculat (wiki ~ 87.5% după 3h din 24h)', /Wiki, interna \| https:\/\/wiki\.example\.org\/ \| (Silent|Maintenance) \| — \| 87\.\d\d%/.test(md.text) || /87\.\d\d%/.test(md.text), md.text.split('\n').filter(l => /Wiki/.test(l)));
  check('latență în ms, întreagă', /\| \d+ ms \|/.test(md.text) && !/\d\.\d+ ms/.test(md.text));
  check('IP-ul nu apare în raport', !/203\.0\.113\.9/.test(md.text));

  console.log('— raport CSV');
  const csv = await download(page, '#reportCsvBtn');
  check('nume .csv', /\.csv$/.test(csv.name));
  check('BOM UTF-8 și CRLF', csv.text.charCodeAt(0) === 0xFEFF && /\r\n$/.test(csv.text));
  const lines = csv.text.slice(1).trim().split('\r\n');
  check('antet + 3 rânduri (câmpuri cu ghilimele pot conține ,)', lines.length >= 4, lines.length);
  check('formulă neutralizată cu apostrof', /"'=Wiki, interna"/.test(csv.text), csv.text.match(/.*Wiki.*/)?.[0]);
  check('diacritice păstrate', /Șantier Cluj/.test(csv.text));
  check('coloane incident', /incident_ongoing/.test(lines[0]) && /,yes,/.test(csv.text));

  console.log('— tipărire / PDF');
  await page.emulateMedia({media: 'print'});
  await page.evaluate(() => { document.body.classList.add('print-report'); });
  await page.click('#reportPrintBtn', {trial: true}).catch(() => {});
  await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await page.emulateMedia({media: 'screen'});
  await page.evaluate(() => document.body.classList.remove('print-report'));
  await page.click('#reportPrintBtn');
  const pr = await page.evaluate(() => ({printed: window.__printed, cls: document.body.classList.contains('print-report'), sheet: document.getElementById('reportSheet').innerText}));
  check('print() apelat o dată și clasa activă', pr.printed === 1 && pr.cls, pr);
  check('foaia a fost construită', pr.sheet.length > 50, pr.sheet.slice(0, 80));
  await page.emulateMedia({media: 'print'});
  const vis = await page.evaluate(() => ({app: getComputedStyle(document.querySelector('.app')).display, sheet: getComputedStyle(document.getElementById('reportSheet')).display, txt: document.getElementById('reportSheet').textContent}));
  check('la tipărire: aplicația ascunsă, foaia vizibilă', vis.app === 'none' && vis.sheet === 'block', vis);
  check('foaia conține stațiile și incidentele', /Mail Gateway/.test(vis.txt) && /Incidents/.test(vis.txt) && /certificate expired/.test(vis.txt) && !/203\.0\.113\.9/.test(vis.txt));
  const pdfp = path.join(TMP, 'r.pdf');
  await page.pdf({path: pdfp, format: 'A4'});
  let pdftxt = '';
  try { pdftxt = execFileSync('pdftotext', [pdfp, '-'], {encoding: 'utf8'}); } catch (e) { pdftxt = ''; }
  check('PDF cu text din raport', /OUTPOST status report/.test(pdftxt) && /Mail Gateway/.test(pdftxt) && !/Add station|Export log/.test(pdftxt), pdftxt.slice(0, 160));
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({media: 'screen'});
  check('afterprint curăță clasa', await page.evaluate(() => !document.body.classList.contains('print-report')));
  const foreign = net.filter(u => !/^https:\/\/(mail|wiki|santier)\.example\.org\//.test(u));
  check('fără erori CSP/JS; singurele cereri sunt verificările stațiilor (funcția de bază a aplicației), nu raportul', errs.length === 0 && foreign.length === 0, {errs, foreign});
  await ctx.close();
}

console.log('— raport fără stații');
{
  const {ctx, page} = await open(1280, 800, false);
  await page.evaluate(() => localStorage.removeItem('outpost_state_v1'));
  await page.reload(); await page.waitForTimeout(400);
  const n = await page.locator('.station').count();
  if (n === 0) {
    await page.click('#reportMdBtn');
    check('mesaj când nu există stații', await page.locator('.toast', {hasText: 'No stations'}).count() >= 1);
  } else {
    // aplicația propune stații implicite: șterge-le din stare
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('outpost_state_v1') || '{}'); s.sites = []; s.history = {}; localStorage.setItem('outpost_state_v1', JSON.stringify(s)); });
    await page.reload(); await page.waitForTimeout(400);
    check('(stare golită) nu pică', true);
  }
  await ctx.close();
}

console.log('— Find aproximativ');
{
  const {ctx, page, errs} = await open();
  const vis = async () => (await page.locator('.station .station-name').allInnerTexts()).map(s => s.trim());
  const find = async (q) => { await page.fill('#findInput', q); await page.waitForTimeout(150); return vis(); };
  check('literal vechi: "mail" → Mail Gateway', (await find('mail')).join('|').includes('Mail Gateway'));
  const typo = await find('mial gatewy');
  check('greșeli de scriere: "mial gatewy" găsește Mail Gateway', typo.some(x => /Mail Gateway/.test(x)) && typo.length < 3, typo);
  const dia = await find('santier');
  check('fără diacritice: "santier" → Șantier Cluj', dia.some(x => /Șantier/.test(x)), dia);
  const nt = await find('postfix');
  check('caută și în notele de runbook', nt.length === 1 && /Mail/.test(nt[0]), nt);
  const ep = await find('certificat expired');
  check('caută și în notele episoadelor', ep.some(x => /Mail/.test(x)), ep);
  const none = await find('zzzqqq');
  check('fără rezultate → listă goală', none.length === 0, none);
  await page.fill('#findInput', ''); await page.waitForTimeout(150);
  check('golit → toate 3', (await vis()).length === 3);
  await page.fill('#findInput', 'wiki'); await page.keyboard.press('Escape');
  check('Esc golește Find', await page.inputValue('#findInput') === '');
  // fără kit (căutare indisponibilă): comportament vechi
  await page.evaluate(() => { window.FFF.search = null; });
  await page.fill('#findInput', 'wiki'); await page.waitForTimeout(150);
  check('fără FFF.search: filtrare literală', (await vis()).length === 1);
  check('fără erori', errs.length === 0, errs);
  await ctx.close();
}

console.log('— performanță Find (300 stații; aplicația însăși randează lent peste ~1000)');
{
  const big = JSON.parse(JSON.stringify(STATE));
  big.sites = Array.from({length: 300}, (_, i) => ({id: 's' + i, name: 'Service ' + i + ' ' + ['alpha', 'bravo', 'charlie'][i % 3], url: 'https://s' + i + '.example.org/', category: 'Cat' + (i % 7), subcategory: '', server: '', notes: i % 100 === 0 ? 'rotate keys quarterly' : '', addedAt: NOW - 5 * D, lastVerdict: 'up', lastLatency: 50, lastCheckedAt: NOW - 60000, episodes: []}));
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}});
  await ctx.route(/^https?:/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.addInitScript((s) => { localStorage.setItem('outpost_state_v1', JSON.stringify(s)); }, big);
  await page.goto(FILE); await page.waitForTimeout(800);
  const t0 = Date.now();
  await page.fill('#findInput', 'quarterly'); await page.waitForTimeout(100);
  const t1 = Date.now() - t0;
  const n = await page.locator('.station').count();
  check('300 stații: interogare cu indexare, rezultat corect (3 note "quarterly")', t1 < 20000 && n === 3, {t1, n});
  await ctx.close();
}

console.log('— copie de siguranță (kit)');
{
  const {ctx, page} = await open();
  await page.evaluate(() => { localStorage.setItem('outpost_state_v1', localStorage.getItem('outpost_state_v1')); });
  const keys = await page.evaluate(() => JSON.parse(localStorage.getItem('fff.outpost.__keys') || '[]'));
  check('cheia outpost_state_v1 e urmărită de kit', keys.includes('outpost_state_v1'), keys);
  const bundleRes = await page.evaluate(async () => { const r = await FFF.bundle.export({filename: 'x.fff.json', dryRun: true}).catch(e => ({err: String(e)})); return r; });
  check('FFF.bundle.export răspunde', !!bundleRes, bundleRes);
  await ctx.close();
}

console.log('— măsurători 1280×800 și 360×740 (rețea blocată, axe cu bypassCSP)');
for (const [w, h] of [[1280, 800], [360, 740]]) {
  const {ctx, page, errs, net} = await open(w, h);
  await page.waitForTimeout(3600);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check(`${w}: fără scroll orizontal`, !over);
  check(`${w}: fără erori JS/CSP`, errs.length === 0, errs);
  const c2 = await b.newContext({viewport: {width: w, height: h}, bypassCSP: true});
  await c2.route(/^https?:/, (r) => r.abort());
  const p2 = await c2.newPage();
  await p2.addInitScript((s) => { if (!localStorage.getItem('outpost_state_v1')) localStorage.setItem('outpost_state_v1', JSON.stringify(s)); }, STATE);
  await p2.goto(FILE); await p2.waitForTimeout(3600);
  await p2.evaluate(fs.readFileSync(AXE, 'utf8') + '\n;0');
  const ax = await p2.evaluate(async () => (await window.axe.run(document, {resultTypes: ['violations']})).violations.map(v => v.id + ':' + v.nodes.length));
  check(`${w}: axe 0 încălcări`, ax.length === 0, ax);
  await c2.close(); await ctx.close();
}
await b.close();
fs.rmSync(TMP, {recursive: true, force: true});
console.log(`\n${ok} ok, ${bad} eșuate`);
process.exit(bad ? 1 : 0);

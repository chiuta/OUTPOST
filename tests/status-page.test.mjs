// Teste v2.0.0: pagină de stare publică (30 de zile), metrici Prometheus, alertă de lentoare.
// [fff-portable] axe-core: FFF_AXE / AXE_PATH, apoi pachetul `axe-core`.
import {createRequire as __fffCR} from 'node:module';
import {readFileSync as __fffRF} from 'node:fs';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const __fffAxe = () => process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return __fffCR(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return undefined; } })();
const APP = JSON.parse(__fffRF(new URL('../app.json', import.meta.url), 'utf8'));
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const AXE = __fffAxe();
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const TMP = fs.mkdtempSync(path.join(process.env.FFF_TMP || os.tmpdir(), 'outp2-'));
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const NOW = new Date('2026-10-14T10:00:00Z').getTime();
const H = 3600000, D = 86400000;
const STATE = {
  sites: [
    {id: 'a1', name: 'Mail Gateway', url: 'https://mail.example.org/', category: 'Infra', subcategory: '', server: '', notes: '', addedAt: NOW - 40 * D, lastVerdict: 'up', lastLatency: 123.4, lastCheckedAt: NOW - 5 * 60000, episodes: [{startedAt: NOW - 2 * D, endedAt: NOW - 2 * D + 30 * 60000, note: 'certificate expired <img src=x>'}], lastIp: '203.0.113.9'},
    {id: 'a2', name: '=Wiki, interna', url: 'https://wiki.example.org/', category: 'Docs', subcategory: '', server: '', notes: '', addedAt: NOW - 10 * D, lastVerdict: 'down', lastLatency: null, lastCheckedAt: NOW - 60000, episodes: [{startedAt: NOW - 3 * H, endedAt: null, note: 'database unreachable'}]},
    {id: 'a3', name: 'Șantier "Cluj"', url: 'https://santier.example.org/', category: 'Docs', subcategory: '', server: '', notes: '', addedAt: NOW - 2 * H, lastVerdict: 'up', lastLatency: 80, lastCheckedAt: NOW - 120000, episodes: []}
  ],
  history: {}, settings: {autoRefreshMs: 0}, lastActiveAt: NOW - 60000, appliedSeedSets: ['all']
};
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
async function open(o = {}) {
  const ctx = await b.newContext({viewport: {width: o.w || 1280, height: 900}, acceptDownloads: true, locale: 'en-US', timezoneId: 'UTC', ...(o.bypass ? {bypassCSP: true} : {})});
  const net = [];
  await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); if (o.handler) return o.handler(r); r.abort(); });
  const page = await ctx.newPage();
  if (!o.noClock) await page.clock.install({time: NOW});
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) errs.push('csp: ' + t); });
  await page.addInitScript((s) => { if (!localStorage.getItem('outpost_state_v1')) localStorage.setItem('outpost_state_v1', JSON.stringify(s)); }, o.state || STATE);
  await page.goto(FILE); await page.waitForTimeout(500);
  return {ctx, page, errs, net};
}
async function download(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(selector)]);
  const p = path.join(TMP, dl.suggestedFilename()); await dl.saveAs(p);
  return {name: dl.suggestedFilename(), text: fs.readFileSync(p, 'utf8')};
}

{
  const {ctx, page, errs, net} = await open();
  console.log('— pornire');
  check('versiune ' + APP.version, await page.evaluate((v) => document.querySelector('meta[name=application-version]').content === v, APP.version));
  check('fără pageerror/CSP', errs.length === 0, errs);

  console.log('— pagina de stare publică');
  const pg = await download(page, '#publicPageBtn');
  check('nume cu dată', pg.name === 'outpost-status-30d-2026-10-14.html', pg.name);
  const html = pg.text;
  check('fără script și fără resurse externe', !/<script/i.test(html) && !/<link /i.test(html) && !/src=["']https?:/i.test(html));
  check('CSP restrictivă în pagină', /Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'/.test(html));
  check('banner: 1 din 3 stații au probleme', /<div class="ov bad" role="status">1 of 3 stations have problems<\/div>/.test(html), html.match(/class="ov[^<]*</)?.[0]);
  const cards = html.split('<article class="st">').slice(1);
  check('3 carduri, fiecare cu 30 de bare', cards.length === 3 && cards.every((c) => (c.match(/<span class="b /g) || []).length === 30));
  const aria = (c) => c.match(/aria-label="30-day history: (\d+) days without incidents, (\d+) with incidents, (\d+) without data"/).slice(1).map(Number);
  check('Mail: 29 zile fără incidente, 1 cu incidente', JSON.stringify(aria(cards[0])) === '[29,1,0]', aria(cards[0]));
  check('Wiki: 10 fără incidente, 1 cu (azi), 19 fără date', JSON.stringify(aria(cards[1])) === '[10,1,19]', aria(cards[1]));
  check('Șantier: doar azi măsurat', JSON.stringify(aria(cards[2])) === '[1,0,29]', aria(cards[2]));
  check('zi cu 30 min de întrerupere = bară „warn" cu procent', /<span class="b warn" title="2026-10-12: 97\.92%">/.test(cards[0]));
  check('zi cu 7 h din 10 funcționale = bară „bad" (70%)', /<span class="b bad" title="2026-10-14: 70\.00%">/.test(cards[1]), cards[1].match(/class="b bad"[^>]*/)?.[0]);
  check('zile fără date etichetate', /title="2026-09-20: no data"/.test(cards[2]));
  check('disponibilitate 30 zile: Mail ~99.95%', /30-day uptime: <b>99\.9\d%<\/b>/.test(cards[0]), cards[0].match(/30-day uptime: <b>[^<]*/)?.[0]);
  check('stație sub o oră de monitorizare nu inventează procent; Șantier are 2h → procent', /30-day uptime: <b>100\.00%<\/b>/.test(cards[2]));
  check('nume cu ghilimele și = escapate', cards[2].includes('Șantier &quot;Cluj&quot;') && cards[1].includes('=Wiki, interna'));
  check('adrese IP nu apar', !/203\.0\.113\.9/.test(html));
  check('incidente: 2, cele mai noi întâi, în curs marcat', /<ul class="inc"><li><b>=Wiki, interna<\/b>[^]*<em>ongoing<\/em>[^]*<li><b>Mail Gateway<\/b> — 2026-10-12 10:00 UTC → 2026-10-12 10:30 UTC \(30m 0s\)/.test(html), html.match(/<ul class="inc">[^]*?<\/ul>/)?.[0]);
  check('notele de incident NU sunt incluse implicit', !/certificate expired|database unreachable/.test(html));
  check('subsol: instantaneu static + avertisment', /Static snapshot generated by OUTPOST on 2026-10-14T10:00:\d\dZ/.test(html) && /not an independent measurement/.test(html));
  const hm = html.match(/<p>SHA-256: ([0-9a-f]{64})<\/p>/);
  check('SHA-256 în subsol corespunde conținutului', !!hm && hm[1] === sha(html.replace(hm[0], '')));

  console.log('— opțiuni: fără adrese, cu note');
  await page.uncheck('#spUrls'); await page.check('#spNotes');
  const pg2 = await download(page, '#publicPageBtn');
  check('fără adrese: niciun link către stații', !/mail\.example\.org|wiki\.example\.org/.test(pg2.text));
  check('cu note: apar, escapate', pg2.text.includes('database unreachable') && pg2.text.includes('certificate expired &lt;img src=x&gt;') && !pg2.text.includes('<img src=x>'));
  await page.check('#spUrls');
  const pg3 = await download(page, '#publicPageBtn');
  check('cu adrese: linkuri rel=noopener', /<a href="https:\/\/mail\.example\.org\/" rel="noopener noreferrer">/.test(pg3.text));

  console.log('— pagina generată, deschisă offline');
  const ctx2 = await b.newContext({viewport: {width: 390, height: 800}, bypassCSP: true}); const net2 = [];
  await ctx2.route(/^https?:/, (r) => { net2.push(r.request().url()); r.abort(); });
  const p2 = await ctx2.newPage(); const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(e.message));
  await p2.goto('file://' + path.join(TMP, 'outpost-status-30d-2026-10-14.html')); await p2.waitForTimeout(300);
  check('zero cereri de rețea la deschidere', net2.length === 0, net2);
  check('fără defilare orizontală la 390px', await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('culoare + text: pastila de stare are text', (await p2.locator('.pill').allTextContents()).join('|') === 'Contact|Silent|Contact');
  if (AXE) {
    await p2.addScriptTag({content: fs.readFileSync(AXE, 'utf8')});
    for (const scheme of ['light', 'dark']) {
      await p2.emulateMedia({colorScheme: scheme});
      const v = await p2.evaluate(async () => (await axe.run(document)).violations.map((x) => x.id + ':' + x.nodes.length));
      check('axe 0 violări pagină generată (' + scheme + ')', v.length === 0, v);
    }
  }
  await ctx2.close();

  console.log('— metrici Prometheus');
  const pm = await download(page, '#promBtn');
  check('nume .prom cu dată', pm.name === 'outpost-metrics-2026-10-14.prom', pm.name);
  const lines = pm.text.split('\n');
  check('se termină cu newline', pm.text.endsWith('\n') && !pm.text.endsWith('\n\n'));
  check('fiecare linie e comentariu sau metrică validă', lines.filter(Boolean).every((l) => /^# (HELP|TYPE) outpost_\w+ /.test(l) || /^outpost_\w+(\{.*\})? -?[0-9.e+-]+$/.test(l)), lines.filter(Boolean).find((l) => !(/^# (HELP|TYPE) outpost_\w+ /.test(l) || /^outpost_\w+(\{.*\})? -?[0-9.e+-]+$/.test(l))));
  check('TYPE gauge pentru fiecare familie', (pm.text.match(/^# TYPE /gm) || []).length === (pm.text.match(/^# HELP /gm) || []).length);
  check('up: Mail=1, Wiki=0', pm.text.includes('outpost_station_up{station="Mail Gateway",url="https://mail.example.org/"} 1') && pm.text.includes('outpost_station_up{station="=Wiki, interna",url="https://wiki.example.org/"} 0'));
  check('ghilimele escapate în etichete', pm.text.includes('station="Șantier \\"Cluj\\""'));
  await page.waitForTimeout(300);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost_state_v1')).sites.find((x) => x.id === 'a1'));
  check('latență în secunde = valoarea din stare / 1000', saved.lastLatency != null && pm.text.includes('outpost_station_latency_seconds{station="Mail Gateway",url="https://mail.example.org/"} ' + (saved.lastLatency / 1000)), [saved.lastLatency]);
  check('timestamp ultima verificare (secunde, întreg)', /last_check_timestamp_seconds\{station="Mail Gateway",url="https:\/\/mail\.example\.org\/"\} \d{10}\n/.test(pm.text));
  check('uptime_ratio 24h/7d/30d pentru Mail', /uptime_ratio\{station="Mail Gateway",url="[^"]+",window="24h"\} 1\.000000/.test(pm.text) && /window="7d"\} 0\.99\d+/.test(pm.text) && /window="30d"\} 0\.99\d+/.test(pm.text));
  check('incidente 30 de zile', pm.text.includes('outpost_station_incidents_30d{station="Mail Gateway",url="https://mail.example.org/"} 1') && pm.text.includes('outpost_station_incidents_30d{station="=Wiki, interna",url="https://wiki.example.org/"} 1'));
  check('versiunea în outpost_info', pm.text.includes('outpost_info{version="' + APP.version + '"} 1'));
  check('IP-ul nu apare în metrici', !/203\.0\.113\.9/.test(pm.text));
  const before = net.length; await download(page, '#promBtn'); await download(page, '#publicPageBtn');
  check('exporturile nu fac cereri de rețea', net.length === before, net.slice(before));
  await ctx.close();
}

console.log('— alertă de lentoare');
{
  let delay = 900;
  const st = JSON.parse(JSON.stringify(STATE)); st.sites = [{id: 's1', name: 'Slow One', url: 'https://slow.example.org/', category: '', subcategory: '', server: '', notes: '', addedAt: Date.now() - 30 * D, lastVerdict: 'up', lastLatency: 50, lastCheckedAt: Date.now() - 600000, episodes: []}];
  const {ctx, page} = await open({noClock: true, state: st, handler: async (r) => { const u = r.request().url(); if (/slow\.example\.org/.test(u)) { await new Promise((res) => setTimeout(res, delay)); return r.fulfill({status: 200, contentType: 'text/html', body: '<title>x</title>'}).catch(() => {}); } r.abort(); }});
  check('selector prezent, implicit oprit', (await page.inputValue('#latAlertSelect')) === '0');
  await page.selectOption('#latAlertSelect', '500');
  check('pragul se salvează în stare', await page.evaluate(() => JSON.parse(localStorage.getItem('outpost_state_v1')).settings.latencyAlertMs === 500));
  await page.click('#checkAllBtn'); await page.waitForTimeout(1800);
  check('o singură citire lentă → încă nicio alertă', (await page.locator('#toastContainer .toast').allTextContents()).every((x) => !/is slow/.test(x)));
  await page.click('#checkAllBtn'); await page.waitForTimeout(1800);
  const toasts1 = (await page.locator('#toastContainer .toast').allTextContents()).join('|');
  check('a doua citire lentă consecutivă → alertă cu valoare și prag', /Slow One is slow: \d{3,4} ms \(limit 500 ms\)/.test(toasts1), toasts1);
  await page.click('#checkAllBtn'); await page.waitForTimeout(1800);
  const slowToasts = (await page.locator('#toastContainer .toast').allTextContents()).filter((x) => /is slow/.test(x));
  check('a treia citire nu repetă alerta', slowToasts.length <= 1, slowToasts);
  delay = 10;
  await page.waitForTimeout(3500);
  await page.click('#checkAllBtn'); await page.waitForTimeout(1200);
  check('revenire sub prag → mesaj', (await page.locator('#toastContainer .toast').allTextContents()).some((x) => /back under 500 ms/.test(x)), await page.locator('#toastContainer .toast').allTextContents());
  await ctx.close();
}
console.log('— mobil');
{
  const {ctx, page} = await open({w: 390});
  check('fără defilare orizontală la 390px', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await ctx.close();
}
await b.close();
console.log(`\n${ok} reușite, ${bad} eșuate`);
process.exit(bad ? 1 : 0);

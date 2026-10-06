import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { createRequire } from 'node:module';

// Install these optional review tools outside the repository; see validation.md.
const require = createRequire(join(process.env.BROWSER_TOOLS_ROOT || process.cwd(), 'package.json'));
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const root = process.cwd();
const output = resolve(root, 'docs/rewards');
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!path.startsWith('/preview/')) { res.writeHead(404).end(); return; }
  const file = resolve(root, 'dist', path.slice(9) || 'index.html');
  if (!file.startsWith(resolve(root, 'dist') + '/')) { res.writeHead(404).end(); return; }
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const report = { date: new Date().toISOString(), viewports: [], screenshots: [], audits: [], checks: [], errors: [], failedResources: [] };
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  report.browser = browser.version();
  // Optional read-only live check. The default run isolates interaction checks from relay availability.
  if (process.env.CHECK_LIVE === '1') {
    const live = await browser.newPage();
    try {
      await live.goto(url);
      await live.waitForFunction(() => !document.querySelector('.loading-state'), null, { timeout: 35000 });
      report.liveRead = await live.evaluate(() => ({ count: document.querySelectorAll('article').length, error: document.querySelector('[role=alert]')?.textContent || '', empty: document.body.textContent.includes('Be the first in the pond.') }));
    } catch (error) { report.liveReadError = String(error); }
    await live.close();
  }

  const records = new Map();
  let offline = false;
  const requests = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  async function mockRelays(ctx) {
    await ctx.routeWebSocket(/wss:\/\//, socket => {
      socket.onMessage(raw => {
        const [kind, value, filter] = JSON.parse(raw);
        requests.push([kind, filter]);
        if (kind === 'EVENT') {
          records.set(value.id, value);
          setTimeout(() => socket.send(JSON.stringify(['OK', value.id, true, ''])), 150);
        }
        if (kind === 'REQ') {
          if (offline) { socket.send(JSON.stringify(['CLOSED', value, 'Offline fixture'])); return; }
          for (const event of records.values()) {
            if (filter.ids && !filter.ids.includes(event.id)) continue;
            if (filter['#t'] && !event.tags.some(t => t[0] === 't' && filter['#t'].includes(t[1]))) continue;
            socket.send(JSON.stringify(['EVENT', value, event]));
          }
          socket.send(JSON.stringify(['EOSE', value]));
        }
      });
    });
  }
  await mockRelays(context);
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') report.errors.push(msg.text()); });
  page.on('requestfailed', req => report.failedResources.push({ url: req.url(), error: req.failure()?.errorText }));
  page.on('response', res => { if (res.status() >= 400) report.failedResources.push({ url: res.url(), status: res.status() }); });
  await page.goto(url); console.log('Production export loaded');
  await page.getByRole('heading', { name: 'Be the first in the pond.' }).waitFor();
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://community.hackathon.sites.imd.fun/');
  assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), 'https://community.hackathon.sites.imd.fun/');
  assert.equal(await page.getByRole('link', { name: 'community.hackathon.sites.imd.fun' }).count(), 0);
  assert.equal(await page.locator('article').count(), 0);
  report.checks.push('Empty directory, canonical and Open Graph retained; footer hostname absent');

  async function screenshot(name) {
    const path = `rewards-${name}.jpeg`;
    await page.screenshot({ path: join(output, path), type: 'jpeg', quality: 78, fullPage: !(await page.locator('dialog').count()) });
    report.screenshots.push(path);
  }
  async function overflow(label) {
    const result = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, page: document.documentElement.scrollWidth, dialog: document.querySelector('dialog') && { client: document.querySelector('dialog').clientWidth, scroll: document.querySelector('dialog').scrollWidth, top: document.querySelector('dialog').getBoundingClientRect().top, bottom: document.querySelector('dialog').getBoundingClientRect().bottom } }));
    report.viewports.push({ label, ...result });
    assert.ok(result.page <= result.width, `${label}: page overflow`);
    if (result.dialog) { assert.ok(result.dialog.scroll <= result.dialog.client, `${label}: dialog overflow`); assert.ok(result.dialog.top >= 0 && result.dialog.bottom <= result.height, `${label}: dialog outside viewport`); }
  }
  async function audit(state) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    report.audits.push({ state, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), incomplete: result.incomplete.map(v => v.id) });
  }
  console.log('Empty directory ready'); await screenshot('desktop-empty');
  await audit('empty directory'); console.log('Empty directory audited');
  for (const width of [320, 390, 672, 673, 768, 880, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await overflow('directory');
  }
  await page.setViewportSize({ width: 390, height: 844 }); await screenshot('mobile-empty');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'How it works' }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Open navigation' }).evaluate(el => el === document.activeElement), true);
  const trigger = page.getByRole('button', { name: 'Submit your project', exact: true }).first();
  await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await screenshot('desktop-form'); await overflow('desktop form');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.getByLabel('Personal Twitter account (optional)').evaluate(el => el.required), false);
  await page.getByRole('button', { name: 'Publish project', exact: true }).click();
  assert.equal(await page.locator('#projectUsername').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('[aria-invalid=true]').count(), 4); // Three fields plus consent.
  assert.equal(await page.locator('#twitterUsername').getAttribute('aria-invalid'), 'false');
  await page.setViewportSize({ width: 320, height: 900 });
  await overflow('invalid form'); await dialog.evaluate(el => { el.scrollTop = 0; }); await screenshot('form-errors-320');
  await audit('invalid form');
  assert.equal(await page.getByRole('textbox', { name: /wallet/i }).count(), 0);
  assert.equal(await page.locator('.rewards-notice').textContent(), 'Rewards will be sent directly to the winners deployer addresses');
  await page.getByRole('button', { name: 'Publish project', exact: true }).scrollIntoViewIfNeeded(); await screenshot('notice-320');
  report.checks.push('Keyboard submit entry, optional/required semantics, three required-field errors, consent, first invalid focus, exact rewards notice and no wallet input');

  await page.setViewportSize({ width: 768, height: 1000 });
  await page.locator('#twitterUsername').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.locator('#projectUsername').evaluate(el => el.matches(':focus-visible')), true);
  await dialog.evaluate(el => { el.scrollTop = 0; }); await screenshot('tablet-focus'); await overflow('tablet form');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  report.reducedMotion = await page.getByRole('button', { name: 'Publish project', exact: true }).evaluate(el => getComputedStyle(el).transitionDuration);
  assert.equal(report.reducedMotion, '0s');
  await page.emulateMedia({ forcedColors: 'active' });
  report.forcedColorsFocus = await page.locator('#projectUsername').evaluate(el => ({ outline: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  assert.equal(report.forcedColorsFocus.width, '3px');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  report.fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].map(f => ({ family: f.family, status: f.status })); });
  report.colors = await page.evaluate(() => {
    function pair(selector) {
      const el = document.querySelector(selector); const style = getComputedStyle(el);
      let ancestor = el; let bg;
      while (ancestor) { bg = getComputedStyle(ancestor).backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)') break; ancestor = ancestor.parentElement; }
      return { selector, foreground: style.color, background: bg };
    }
    return ['.rewards-notice', 'label[for=twitterUsername] > span', '.field-error', '.form-alert', '.form-footer .button'].map(pair);
  });
  const luminance = color => {
    const rgb = color.match(/\d+/g).slice(0, 3).map(Number).map(v => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  report.colors = report.colors.map(pair => {
    const a = luminance(pair.foreground); const b = luminance(pair.background);
    const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert.ok(contrast >= 4.5, pair.selector + ' contrast');
    return { ...pair, contrast: Number(contrast.toFixed(2)) };
  });
  // Complete the form by keyboard, leaving personal Twitter empty.
  await page.locator('#twitterUsername').fill('   ');
  await page.keyboard.press('Tab'); await page.keyboard.type('@pond_demo');
  await page.keyboard.press('Tab'); await page.keyboard.type(`0x${'ab'.repeat(20)}`);
  await page.keyboard.press('Tab'); await page.keyboard.type('A community project building useful open tools together.');
  await page.keyboard.press('Tab'); await page.keyboard.press('Space');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Publishing project…' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Close dialog' }).isDisabled(), true);
  await page.getByRole('heading', { name: 'You’re in the pond.' }).waitFor();
  const event = [...records.values()][0];
  assert.equal(JSON.parse(event.content).twitterUsername, '');
  assert.deepEqual(Object.keys(JSON.parse(event.content)).sort(), ['contract', 'description', 'projectUsername', 'schema', 'twitterUsername']);
  assert.deepEqual(event.tags, [['t', 'identitymd-593-community-hackathon-v2']]);
  assert.equal(await page.getByRole('button', { name: 'Explore the collective' }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'pond_demo', exact: true }).waitFor();
  await page.getByRole('searchbox').fill('missing');
  await page.getByRole('heading', { name: 'No matching projects.' }).waitFor();
  await page.getByRole('button', { name: 'All projects', exact: false }).click();
  await page.getByRole('combobox').selectOption('alphabetical');
  await page.getByRole('button', { name: 'pond_demo', exact: true }).click();
  await page.getByText('Not provided', { exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: /@pond_demo/ }).getAttribute('href'), 'https://x.com/pond_demo');
  assert.equal(await page.getByText('Wallet address', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Copy contract address' }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `0x${'ab'.repeat(20)}`);
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))); await overflow('details'); await screenshot('mobile-details');
  await audit('project details');
  await page.keyboard.press('Escape');
  report.checks.push('Keyboard publication with blank personal Twitter; mocked relay ACK/readback; success focus; search reset; sorting; project contact; copy; Escape');
  const reader = await browser.newContext(); await mockRelays(reader);
  const readerPage = await reader.newPage(); await readerPage.goto(url);
  await readerPage.getByRole('button', { name: 'pond_demo', exact: true }).waitFor();
  await readerPage.reload(); await readerPage.getByRole('button', { name: 'pond_demo', exact: true }).waitFor();
  assert.equal(await readerPage.evaluate(() => localStorage.length), 0);
  await reader.close();
  offline = true;
  await page.getByRole('button', { name: 'Refresh projects' }).click();
  await page.getByRole('alert').filter({ hasText: 'Previously loaded projects' }).waitFor();
  assert.equal(await page.locator('article').count(), 1);
  offline = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('alert').waitFor({ state: 'detached' });
  report.checks.push('Fresh browser and reload read same mocked shared record, no localStorage; failed refresh preserves record and retry recovers');
  assert.ok(requests.some(([kind, filter]) => kind === 'REQ' && filter?.ids));
  assert.ok(report.audits.every(a => a.violations.length === 0), 'axe violations');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failedResources, []);
  await context.close();
  report.result = 'passed';
} catch (error) {
  report.result = 'failed'; report.failure = String(error.stack || error); process.exitCode = 1;
} finally {
  await browser?.close(); await new Promise(done => server.close(done));
  await writeFile(join(output, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

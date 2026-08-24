import { chromium } from 'playwright';

const BASE = 'https://safetyvision-ai.onrender.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();

async function login(page, email, senha) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', email);
  await page.fill('#password', senha);
  await page.click('button[type="submit"]');
  await sleep(2500);
}

async function measure(page, path, label) {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await sleep(2000);
  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const offenders = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 1 && rect.width > 0) {
        offenders.push(el.tagName + '.' + (el.className && el.className.toString ? el.className.toString().slice(0,40) : ''));
      }
    });
    return { scroll: de.scrollWidth, client: de.clientWidth, hasScroll: de.scrollWidth > de.clientWidth + 1, offenders: offenders.slice(0,10) };
  });
  console.log(`\n[${label}] ${path}`);
  console.log('  docScroll:', r.scroll, 'client:', r.client, 'hasScroll:', r.hasScroll);
  console.log('  offenders:', r.offenders);
}

try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await login(page, 'tecnico@safetyvision.com', 'Tecnico@123');
  await measure(page, '/tecnico/pgr', 'TECNICO PGR');
  await measure(page, '/tecnico/calculadora', 'TECNICO CALC');

  await page.evaluate(() => localStorage.clear());
  await login(page, 'admin@safetyvision.com', 'Admin@123');
  await measure(page, '/admin/dashboard', 'ADMIN DASHBOARD');

  await ctx.close();
  console.log('\nCONCLUIDO');
} catch (e) {
  console.error('ERRO:', e.message);
} finally {
  await browser.close();
}

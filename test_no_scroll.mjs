import { chromium } from 'playwright';

const BASE = 'https://safetyvision-ai.onrender.com';
const W = 360, H = 820;

async function measure(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  return await page.evaluate(() => {
    const de = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(de.scrollWidth, body.scrollWidth);
    const clientW = de.clientWidth;
    const hasH = scrollW > clientW + 1;
    const hasV = de.scrollHeight > de.clientHeight + 1;
    const scrollBars = {
      hasH, hasV,
      docScrollW: de.scrollWidth, docClientW: de.clientWidth,
      docScrollH: de.scrollHeight, docClientH: de.clientHeight,
      bodyScrollH: body.scrollHeight, bodyClientH: body.clientHeight,
    };
    return scrollBars;
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();

async function login(email, senha, botao) {
  await page.goto(`${BASE}/tecnico/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/tecnico/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', senha);
  await page.click(`button:has-text("${botao}")`);
  await page.waitForTimeout(3000);
}

const results = {};

// Técnico pages
await login('tecnico@safetyvision.com', 'Tecnico@123', 'Entrar como Técnico');
const tecPages = [
  '/tecnico', '/tecnico/nova-inspecao', '/tecnico/empresas',
  '/tecnico/colaboradores', '/tecnico/setores', '/tecnico/historico',
  '/tecnico/checklists', '/tecnico/calculadora-nr28', '/tecnico/epis',
  '/tecnico/treinamentos', '/tecnico/incidentes', '/tecnico/asos',
  '/tecnico/cipa', '/tecnico/cronograma', '/tecnico/pgr',
  '/tecnico/laudos', '/tecnico/conformidade', '/tecnico/planos',
  '/tecnico/nrs', '/tecnico/configuracoes'
];
for (const p of tecPages) {
  const r = await measure(page, p);
  results[p] = r;
  const status = (!r.hasH && !r.hasV) ? 'OK' : `FAIL(h:${r.hasH},v:${r.hasV})`;
  console.log(`[TEC] ${p.padEnd(35)} ${status}  scrollW:${r.docScrollW} clientW:${r.docClientW} scrollH:${r.docScrollH} clientH:${r.docClientH}`);
}

// Admin pages
await page.evaluate(() => localStorage.clear());
await login('admin@safetyvision.com', 'Admin@123', 'Acessar Painel Admin');
const adminPages = ['/admin', '/admin/empresas', '/admin/setores', '/admin/colaboradores', '/admin/usuarios', '/admin/inspecoes'];
for (const p of adminPages) {
  const r = await measure(page, p);
  results[p] = r;
  const status = (!r.hasH && !r.hasV) ? 'OK' : `FAIL(h:${r.hasH},v:${r.hasV})`;
  console.log(`[ADM] ${p.padEnd(35)} ${status}  scrollW:${r.docScrollW} clientW:${r.docClientW} scrollH:${r.docScrollH} clientH:${r.docClientH}`);
}

// Login pages (no auth)
await page.evaluate(() => localStorage.clear());
const loginPages = ['/tecnico/login', '/admin/login'];
for (const p of loginPages) {
  const r = await measure(page, p);
  results[p] = r;
  const status = (!r.hasH && !r.hasV) ? 'OK' : `FAIL(h:${r.hasH},v:${r.hasV})`;
  console.log(`[LOG] ${p.padEnd(35)} ${status}  scrollW:${r.docScrollW} clientW:${r.docClientW} scrollH:${r.docScrollH} clientH:${r.docClientH}`);
}

const fails = Object.entries(results).filter(([,r]) => r.hasH || r.hasV);
console.log(`\n${fails.length === 0 ? 'TODAS OK - ZERO SCROLL BARS' : `${fails.length} FALHOS`}`);
await browser.close();

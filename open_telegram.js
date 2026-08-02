const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:\\Users\\Marcio\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.goto('https://web.telegram.org', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Espera o QR code aparecer (canvas ou imagem)
  console.log('Esperando QR code...');
  try {
    await page.waitForSelector('canvas, img[src*="qr"], .qr-container, .qr', { timeout: 20000 });
    console.log('QR code encontrado!');
  } catch(e) {
    console.log('QR não encontrado por selector, esperando mais...');
  }
  await page.waitForTimeout(10000);
  
  console.log('URL:', page.url());
  
  await page.screenshot({ path: path.join(__dirname, 'telegram_qr.png'), fullPage: false });
  console.log('Screenshot salvo!');
  
  await browser.close();
})();

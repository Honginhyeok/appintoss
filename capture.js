const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://checkin-host.com/?error=TestError', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:/Users/inheu/.gemini/antigravity-ide/brain/d3d42c95-26d0-400e-a54f-fa140e1fbb21/error-modal-screenshot.png' });
  await browser.close();
})();

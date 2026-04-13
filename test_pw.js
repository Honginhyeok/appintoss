const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERR:', err.message));

    await page.goto('https://notification-dashboard-1042551861454.asia-northeast3.run.app/', { waitUntil: 'networkidle' });

    await page.fill('#login-id', 'admin');
    await page.fill('#login-pw', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000); // wait for dashboard load

    // Check Rooms tab
    await page.click('li[data-tab="rooms"]');
    await page.waitForTimeout(1000);
    const roomsHtml = await page.innerHTML('#rooms-grid');
    
    // Check Txs tab
    await page.click('li[data-tab="transactions"]');
    await page.waitForTimeout(1000);
    const txsHtml = await page.innerHTML('#transactions-body');

    console.log('--- ROOMS HTML ---');
    console.log(roomsHtml.substring(0, 300));
    console.log('--- TXS HTML ---');
    console.log(txsHtml.substring(0, 300));

    await browser.close();
  } catch (err) {
    console.error('Test Failed:', err);
  }
})();

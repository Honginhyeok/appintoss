const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

(async () => {
    let executablePath = null;
    for (const path of CHROME_PATHS) {
        if (fs.existsSync(path)) {
            executablePath = path;
            break;
        }
    }
    
    const browser = await puppeteer.launch({ 
        executablePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        console.log('Navigating to error URL...');
        await page.goto('https://checkin-host.com/?error=TossLoginFailed', { waitUntil: 'networkidle0' });
        
        console.log('Taking screenshot...');
        await page.screenshot({ path: 'C:/Users/inheu/.gemini/antigravity-ide/brain/d3d42c95-26d0-400e-a54f-fa140e1fbb21/test_error_modal.png' });
        
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);
        
        // Let's also check if the modal element exists
        const modalExists = await page.evaluate(() => {
            return !!document.getElementById('dynamic-error-modal');
        });
        console.log(`Does modal exist in DOM?: ${modalExists}`);

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();

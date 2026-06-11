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

    if (!executablePath) {
        console.error('Could not find Chrome or Edge installation.');
        process.exit(1);
    }
    
    const browser = await puppeteer.launch({ 
        executablePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        console.log('Navigating to https://checkin-host.com/ ...');
        await page.goto('https://checkin-host.com/', { waitUntil: 'networkidle0' });
        
        console.log('Taking screenshot of Home Screen...');
        await page.screenshot({ path: 'C:/Users/inheu/.gemini/antigravity-ide/brain/d3d42c95-26d0-400e-a54f-fa140e1fbb21/test_1_home.png' });

        console.log('Triggering startTossOAuthLogin() directly...');
        // Execute the function directly to avoid UI interaction issues
        await page.evaluate(() => {
            // Ensure state is set before login
            window.state = { selectedRole: 'LANDLORD' };
            startTossOAuthLogin();
        });
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Navigation handled.'));
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('Taking screenshot after Toss Login trigger...');
        await page.screenshot({ path: 'C:/Users/inheu/.gemini/antigravity-ide/brain/d3d42c95-26d0-400e-a54f-fa140e1fbb21/test_2_after_click.png' });
        
        const currentUrl = page.url();
        console.log(`Current URL after click: ${currentUrl}`);

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();


import { getBrowser, closeBrowser } from './scrapers/utils.js';

async function debugPasso() {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        console.log('Navigating to Passo Music...');
        await page.goto('https://www.passo.com.tr/tr/kategori/muzik-konser-festival-biletleri/8615', { waitUntil: 'networkidle2' });

        console.log('Waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));

        // Dump all links
        const hrefs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href);
        });

        const eventLinks = hrefs.filter(h => h.includes('/etkinlik/'));
        console.log(`Total Links: ${hrefs.length}`);
        console.log(`Event Links found: ${eventLinks.length}`);
        console.log('Sample links:', hrefs.slice(0, 10));

        if (eventLinks.length === 0) {
            console.log('0 links found. Saving screenshot and HTML...');
            const fs = require('fs');
            await page.screenshot({ path: 'debug_screenshot_passo.png' });
            const html = await page.content();
            fs.writeFileSync('debug_html_passo.html', html);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

debugPasso();

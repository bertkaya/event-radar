
import { Scraper, Event } from './types.js';
import { getBrowser, normalizeDate, sleep } from './utils.js';

export const BiletinialScraper: Scraper = {
    name: 'Biletinial',
    async scrape(): Promise<Event[]> {
        console.log('[Biletinial] Starting scrape...');
        const browser = await getBrowser();
        const events: Event[] = [];
        const page = await browser.newPage();

        try {
            // 1. Listings
            const url = 'https://biletinial.com/tr-tr/muzik'; // Direct music category
            console.log(`[Biletinial] Navigating to ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Scroll bits
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await sleep(2000);

            const links = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a[href*="/etkinlik/"], a.event-card'));
                return [...new Set(anchors.map(a => (a as HTMLAnchorElement).href))];
            });

            console.log(`[Biletinial] Found ${links.length} events. Processing first 10...`);
            await page.close();

            // 2. Details
            for (const link of links.slice(0, 10)) {
                console.log(`[Biletinial] Scraping: ${link}`);
                const detailPage = await browser.newPage();
                try {
                    await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 45000 });

                    const eventData = await detailPage.evaluate(() => {
                        const title = document.querySelector('h1')?.textContent?.trim() ||
                            document.querySelector('.event-title')?.textContent?.trim() || '';

                        // Dates often in dedicated block
                        const dateText = document.querySelector('.event-date')?.textContent?.trim() ||
                            document.querySelector('.date')?.textContent?.trim() || '';

                        const venueName = document.querySelector('.place')?.textContent?.trim() ||
                            document.querySelector('.venue')?.textContent?.trim() || '';

                        const description = document.querySelector('.event-content')?.innerHTML?.trim() ||
                            document.querySelector('.description')?.innerHTML?.trim() || '';

                        const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

                        // Rules
                        const rules: string[] = [];
                        const ruleLis = document.querySelectorAll('.event-rules li, #rules li');
                        ruleLis.forEach(li => rules.push(li.textContent?.trim() || ''));

                        // Ticket Details
                        // Biletinial generic pricing container?
                        const tickets: { name: string, price: string }[] = [];
                        // Look for block containing prices
                        // Often hidden behind "Bilet Al", but sometimes listed.
                        // We'll try to find any visible price info.
                        const priceEls = document.querySelectorAll('.price-option');
                        priceEls.forEach(el => {
                            const name = el.querySelector('.name')?.textContent?.trim() || 'Ticket';
                            const price = el.querySelector('.price')?.textContent?.trim() || '';
                            if (price) tickets.push({ name, price });
                        });

                        return { title, dateText, venueName, description, imageUrl, rules, tickets };
                    });

                    if (!eventData.title) {
                        console.warn(`[Biletinial] Skipped ${link} - No title`);
                        await detailPage.close();
                        continue;
                    }

                    const metaDate = await detailPage.evaluate(() =>
                        document.querySelector('meta[itemprop="startDate"]')?.getAttribute('content')
                    );
                    const startTime = normalizeDate(metaDate || '') || new Date().toISOString();

                    events.push({
                        title: eventData.title,
                        venue_name: eventData.venueName || 'Unknown Venue',
                        start_time: startTime,
                        description: eventData.description,
                        image_url: eventData.imageUrl,
                        source_url: link,
                        category: 'Konser',
                        rules: eventData.rules,
                        ticket_details: eventData.tickets,
                        is_approved: false
                    });

                } catch (e) {
                    console.error(`[Biletinial] Error processing ${link}:`, e);
                } finally {
                    await detailPage.close();
                }
            }

        } catch (e) {
            console.error('[Biletinial] Fatal:', e);
        }

        return events;
    }
};

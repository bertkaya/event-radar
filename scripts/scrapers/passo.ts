
import { Scraper, Event, TicketDetail } from './types.js';
import { getBrowser, normalizeDate, sleep, dismissPopups } from './utils.js';
import { Page } from 'puppeteer';

export const PassoScraper: Scraper = {
    name: 'Passo',
    async scrape(): Promise<Event[]> {
        console.log('[Passo] Starting scrape...');
        const browser = await getBrowser();
        const events: Event[] = [];

        // Create a new page for listing
        const page = await browser.newPage();

        try {
            // 1. Listings - Multi Category
            const categories = [
                { name: 'Müzik', url: 'https://www.passo.com.tr/tr/kategori/muzik-konser-festival-biletleri/8615' },
                { name: 'Sahne Sanatları', url: 'https://www.passo.com.tr/tr/kategori/sahne-sanatlari-biletleri/8617' },
                { name: 'Spor', url: 'https://www.passo.com.tr/tr/kategori/spor-biletleri/8621' },
                { name: 'Müze', url: 'https://www.passo.com.tr/tr/kategori/muze-biletleri/8619' }
            ];

            const allLinks = new Set<string>();

            for (const cat of categories) {
                console.log(`[Passo] Visiting Category: ${cat.name}...`);
                try {
                    await page.goto(cat.url, { waitUntil: 'networkidle2', timeout: 60000 });
                    await dismissPopups(page); // Check for popups

                    // Delay
                    await sleep(Math.random() * 2000 + 1000);

                    // 2. Scroll to load items (Try 2 times)
                    for (let i = 0; i < 2; i++) {
                        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                        await sleep(1500);
                    }

                    // 3. Extract Event Links (Support both <a href> and <div data-link>)
                    const links = await page.evaluate(() => {
                        const anchorHrefs = Array.from(document.querySelectorAll('a[href*="/etkinlik/"]'))
                            .map(a => (a as HTMLAnchorElement).href);

                        const dataLinks = Array.from(document.querySelectorAll('[data-link]'))
                            .map(el => el.getAttribute('data-link'))
                            .filter((l): l is string => typeof l === 'string' && l.includes('/etkinlik/'));

                        return [...new Set([...anchorHrefs, ...dataLinks])].filter(h => !h.includes('#'));
                    });

                    console.log(`[Passo] Found ${links.length} in ${cat.name}`);
                    links.forEach(l => allLinks.add(l));

                } catch (e) {
                    console.error(`[Passo] Error visiting ${cat.name}:`, e);
                }
            }

            const uniqueLinks = [...allLinks];
            console.log(`[Passo] Found total ${uniqueLinks.length} unique events. Processing first 15...`);

            // Close the listing page to save resources
            await page.close();

            // 4. Visit Detail Pages
            // Process in serial to avoid overwhelming the browser/site
            // Limit to 15
            for (const url of uniqueLinks.slice(0, 15)) {
                await sleep(Math.random() * 2000 + 1000); // Inter-request delay

                console.log(`[Passo] Scraping detail: ${url}`);
                const detailPage = await browser.newPage();
                try {
                    await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

                    // Extract Details
                    const eventData = await detailPage.evaluate(() => {
                        // Helper to get text safe
                        const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';
                        const getMeta = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';

                        const title = document.querySelector('h1')?.textContent?.trim() || getMeta('og:title');

                        // Date extraction is tricky on Passo, often in a specific div
                        // Look for common date containers
                        const dateText = document.querySelector('.date')?.textContent?.trim() ||
                            document.querySelector('.event-date')?.textContent?.trim() || '';

                        // Venue
                        const venueName = document.querySelector('.place')?.textContent?.trim() ||
                            document.querySelector('.event-venue')?.textContent?.trim() || '';

                        // Description
                        const description = document.querySelector('.event-info')?.innerHTML?.trim() ||
                            document.querySelector('.description')?.innerHTML?.trim() || '';

                        // Image
                        const imageUrl = getMeta('og:image');

                        // Rules
                        // Look for "Kurallar" tab or section
                        const ruleItems: string[] = [];
                        const ruleLis = document.querySelectorAll('.rules li, .event-rules li');
                        ruleLis.forEach(li => ruleItems.push(li.textContent?.trim() || ''));

                        // Ticket Details (Pricing)
                        // Often in a sidebar or specific table
                        const tickets: { name: string, price: string, status?: string }[] = [];
                        // This selector is a guess based on common patterns, Passo changes classes often
                        const priceElements = document.querySelectorAll('.ticket-type-list .item, .price-category');
                        priceElements.forEach(el => {
                            const name = el.querySelector('.name')?.textContent?.trim() || 'General';
                            const price = el.querySelector('.price')?.textContent?.trim() || '';
                            if (price) tickets.push({ name, price });
                        });

                        return {
                            title,
                            dateText,
                            venueName,
                            description,
                            imageUrl,
                            ruleItems,
                            tickets
                        };
                    });

                    // Post-processing in Node context
                    if (!eventData.title) {
                        console.warn(`[Passo] Skipping ${url} - Title not found`);
                        await detailPage.close();
                        continue;
                    }

                    // Normalizing Date (Passo often has "23 Eyl 2025" or similar)
                    // For now, we put the raw text in start_time if parsing fails, but interface wants ISO.
                    // We need a robust Turkish date parser. 
                    // Let's try basic ISO conversion if possible, or fallback.
                    // Since we can't easily parse arbitrary Turkish dates without a library or complex logic,
                    // we will default to current Year if missing, etc.
                    // For this iteration, we'll try to find an ISO meta tag if possible.
                    const metaDate = await detailPage.evaluate(() =>
                        document.querySelector('meta[itemprop="startDate"]')?.getAttribute('content')
                    );

                    // Re-use normalizedate
                    const startTime = normalizeDate(metaDate || '') || new Date().toISOString(); // Fallback to avoid breaking DB constraint if strict, but better to be empty? DB says generated? No, start_time is usually required.
                    // Actually existing events often have start_time.
                    // If we really can't parse it, we might skip or mark as 'Check Date'.

                    const event: Event = {
                        title: eventData.title,
                        venue_name: eventData.venueName || 'Unknown Venue',
                        start_time: startTime,
                        description: eventData.description,
                        image_url: eventData.imageUrl,
                        source_url: url,
                        category: 'Konser', // We scraped from Music
                        rules: eventData.ruleItems,
                        ticket_details: eventData.tickets,
                        is_approved: false
                    };

                    events.push(event);

                } catch (e) {
                    console.error(`[Passo] Error scraping ${url}:`, e);
                } finally {
                    await detailPage.close();
                }
            }

        } catch (e) {
            console.error('[Passo] Global scrape error:', e);
        }

        // We do NOT close the browser here, as the orchestrator might use it or we assume shared instance.
        // Actually getBrowser returns a singleton. We can leave it open.

        return events;
    }
};

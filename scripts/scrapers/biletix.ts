
import { Scraper, Event } from './types.js';
import { getBrowser, normalizeDate } from './utils.js';

export const BiletixScraper: Scraper = {
    name: 'Biletix',
    async scrape(): Promise<Event[]> {
        console.log('[Biletix] Starting scrape...');
        const browser = await getBrowser();
        const events: Event[] = [];
        const page = await browser.newPage();

        try {
            // 1. Search for Müzik (Global)
            // We use the search URL directly which is more stable than interacting with headers
            const url = 'https://www.biletix.com/search/TURKIYE/tr?searchq=M%C3%BCzik';
            console.log(`[Biletix] Navigating to ${url}...`);

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // 2. Collect Links
            // Biletix usually lists events in divs with specific classes.
            // We look for 'searchResultItem' or similar structure, or just links to /etkinlik/
            const links = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a[href*="/etkinlik/"]'));
                return [...new Set(anchors.map(a => (a as HTMLAnchorElement).href))];
            });

            console.log(`[Biletix] Found ${links.length} events. Processing first 10...`);
            await page.close();

            // 3. Process Details
            for (const link of links.slice(0, 10)) {
                console.log(`[Biletix] Scraping: ${link}`);
                const detailPage = await browser.newPage();
                try {
                    await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 45000 });

                    const eventData = await detailPage.evaluate(() => {
                        const getText = (s: string) => document.querySelector(s)?.textContent?.trim() || '';

                        // Title
                        const title = document.querySelector('h1')?.textContent?.trim() ||
                            document.querySelector('.event-name')?.textContent?.trim() || '';

                        // Date
                        // Biletix specific date blocks
                        const dateText = document.querySelector('.date-time')?.textContent?.trim() ||
                            document.querySelector('.eventDate')?.textContent?.trim() || '';

                        // Venue
                        const venueName = document.querySelector('.place')?.textContent?.trim() ||
                            document.querySelector('.venue-name')?.textContent?.trim() ||
                            document.querySelector('.placeName')?.textContent?.trim() || '';

                        // Description
                        const description = document.querySelector('.event-description')?.innerHTML?.trim() ||
                            document.querySelector('#tab_aciklama')?.innerHTML?.trim() || '';

                        // Image
                        const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

                        // Rules
                        // Often in a tab "Kurallar" or div
                        const rules: string[] = [];
                        const ruleElements = document.querySelectorAll('#tab_kurallar li, .rules li');
                        ruleElements.forEach(el => rules.push(el.textContent?.trim() || ''));

                        // Ticket Details
                        // Biletix usually has a pricing table or dropdown
                        const tickets: { name: string, price: string }[] = [];
                        // Look for price category blocks
                        const priceCats = document.querySelectorAll('.price-category, .category-name, .prices .price-name');
                        priceCats.forEach(cat => {
                            const name = cat.textContent?.trim() || 'Category';
                            // Try to find price sibling or child
                            // This is heuristic as layout varies
                            const price = cat.parentElement?.querySelector('.price-amount')?.textContent?.trim() || '';
                            if (price) tickets.push({ name, price });
                        });

                        return {
                            title,
                            dateText,
                            venueName,
                            description,
                            imageUrl,
                            rules,
                            tickets
                        };
                    });

                    if (!eventData.title) {
                        console.warn(`[Biletix] Skipped ${link} - No title`);
                        await detailPage.close();
                        continue;
                    }

                    // Date Normalization
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
                    console.error(`[Biletix] Error processing ${link}:`, e);
                } finally {
                    await detailPage.close();
                }
            }

        } catch (e) {
            console.error('[Biletix] Fatal:', e);
        }

        return events;
    }
};

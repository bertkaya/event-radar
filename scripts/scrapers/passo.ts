
import { Scraper, Event, TicketDetail } from './types.js';
import { getBrowser, normalizeDate, sleep, dismissPopups, safeNavigate } from './utils.js';

// All Passo category URLs with proper category mapping
const PASSO_CATEGORIES = [
    { url: 'https://www.passo.com.tr/tr/kategori/futbol-mac-biletleri/4615', category: 'Spor' },
    { url: 'https://www.passo.com.tr/tr/kategori/muzik-konser-festival-biletleri/8615', category: 'Müzik' },
    { url: 'https://www.passo.com.tr/tr/kategori/performans-sanatlari-tiyatro-dans-standup-muzikal-bilet/11615', category: 'Tiyatro' },
    { url: 'https://www.passo.com.tr/tr/kategori/spor-basketbol-etkinlik-mac-biletleri/13615', category: 'Spor' },
    { url: 'https://www.passo.com.tr/tr/kategori/muze-tarihi-mekan-saray-giris-biletleri/15615', category: 'Sanat' },
    { url: 'https://www.passo.com.tr/tr/kategori/diger-etkinlik-biletleri/12615', category: 'Diğer' },
];

export const PassoScraper: Scraper = {
    name: 'Passo',
    async scrape(): Promise<Event[]> {
        console.log('[Passo] Starting comprehensive scrape...');
        const browser = await getBrowser();
        const events: Event[] = [];
        const processedUrls = new Set<string>();

        for (const catInfo of PASSO_CATEGORIES) {
            console.log(`\n[Passo] Category: ${catInfo.category} - ${catInfo.url}`);
            const page = await browser.newPage();

            try {
                // Navigate with popup handling
                await safeNavigate(page, catInfo.url);
                await sleep(3000); // Passo is heavy on JS

                // Scroll to load more events
                for (let i = 0; i < 4; i++) {
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await sleep(1500);
                    await dismissPopups(page); // Check for popups after scroll
                }

                // Find event cards/links
                const eventLinks = await page.evaluate(() => {
                    const links: string[] = [];

                    // Standard anchor links
                    document.querySelectorAll('a[href*="/etkinlik/"]').forEach(a => {
                        const href = (a as HTMLAnchorElement).href;
                        if (href && !href.includes('#') && !links.includes(href)) {
                            links.push(href);
                        }
                    });

                    // Cards with data-link attribute (Passo uses this)
                    document.querySelectorAll('[data-link*="/etkinlik/"]').forEach(el => {
                        const link = el.getAttribute('data-link');
                        if (link) {
                            const fullUrl = link.startsWith('http') ? link : 'https://www.passo.com.tr' + link;
                            if (!links.includes(fullUrl)) links.push(fullUrl);
                        }
                    });

                    // Event cards with onclick
                    document.querySelectorAll('[onclick*="/etkinlik/"]').forEach(el => {
                        const onclick = el.getAttribute('onclick') || '';
                        const match = onclick.match(/\/etkinlik\/[^'"]+/);
                        if (match) {
                            const fullUrl = 'https://www.passo.com.tr' + match[0];
                            if (!links.includes(fullUrl)) links.push(fullUrl);
                        }
                    });

                    // Clickable divs that might be event cards
                    document.querySelectorAll('.event-card, [class*="eventCard"], [class*="event-item"]').forEach(card => {
                        const link = card.querySelector('a')?.href;
                        if (link && link.includes('/etkinlik/') && !links.includes(link)) {
                            links.push(link);
                        }
                    });

                    return [...new Set(links)];
                });

                console.log(`[Passo] Found ${eventLinks.length} event links in ${catInfo.category}`);

                // Process each event (limit to 10 per category)
                for (const eventUrl of eventLinks.slice(0, 10)) {
                    if (processedUrls.has(eventUrl)) continue;
                    processedUrls.add(eventUrl);

                    const eventData = await scrapeEventDetail(browser, eventUrl, catInfo.category);
                    if (eventData) {
                        events.push(eventData);
                        console.log(`[Passo] ✓ Scraped: ${eventData.title}`);
                    }

                    await sleep(2000); // Passo needs longer delays
                }

            } catch (e) {
                console.error(`[Passo] Error in category ${catInfo.category}:`, e);
            } finally {
                await page.close();
            }
        }

        console.log(`\n[Passo] Total scraped: ${events.length} events`);
        return events;
    }
};

async function scrapeEventDetail(browser: any, url: string, category: string): Promise<Event | null> {
    const page = await browser.newPage();

    try {
        await safeNavigate(page, url);
        await sleep(2500);

        // Extra popup check for Passo
        await dismissPopups(page);

        // Extract all event information
        const eventInfo = await page.evaluate(() => {
            const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';
            const getMeta = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';

            // Title
            const title = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('.event-title')?.textContent?.trim() ||
                document.querySelector('[class*="eventName"]')?.textContent?.trim() ||
                getMeta('og:title');

            // Description
            const description = document.querySelector('.event-description')?.innerHTML?.trim() ||
                document.querySelector('[class*="eventDetail"]')?.innerHTML?.trim() ||
                document.querySelector('[class*="description"]')?.innerHTML?.trim() ||
                getMeta('og:description') || '';

            // Image (poster)
            const imageUrl = getMeta('og:image') ||
                document.querySelector('.event-poster img')?.getAttribute('src') ||
                document.querySelector('[class*="eventImage"] img')?.getAttribute('src') ||
                document.querySelector('[class*="poster"] img')?.getAttribute('src') || '';

            // Venue
            const venueName = document.querySelector('.venue-name')?.textContent?.trim() ||
                document.querySelector('[class*="venueName"]')?.textContent?.trim() ||
                document.querySelector('[class*="place"]')?.textContent?.trim() ||
                document.querySelector('.event-venue')?.textContent?.trim() || '';

            const address = document.querySelector('.venue-address')?.textContent?.trim() ||
                document.querySelector('[class*="venueAddress"]')?.textContent?.trim() ||
                document.querySelector('[class*="address"]')?.textContent?.trim() || '';

            // Date/Time
            const startDateMeta = document.querySelector('meta[itemprop="startDate"]')?.getAttribute('content');
            const endDateMeta = document.querySelector('meta[itemprop="endDate"]')?.getAttribute('content');

            const dateText = document.querySelector('.event-date')?.textContent?.trim() ||
                document.querySelector('[class*="eventDate"]')?.textContent?.trim() ||
                document.querySelector('[class*="date"]')?.textContent?.trim() || '';

            // "Lütfen not edin" -> rules (Good to Know)
            const rules: string[] = [];

            // Look for "Lütfen not edin" or similar sections
            document.querySelectorAll('[class*="note"] li, [class*="warning"] li, [class*="info"] li').forEach(li => {
                const text = li.textContent?.trim();
                if (text) rules.push(text);
            });

            // Also check for explicit rules section
            const noteSection = document.querySelector('[class*="pleaseNote"], [class*="notes"], [class*="kurallar"]');
            if (noteSection) {
                noteSection.querySelectorAll('li, p').forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 5 && !rules.includes(text)) {
                        rules.push(text);
                    }
                });
            }

            // Ticket prices
            const ticketTypes: { name: string; price: string; status?: string }[] = [];

            // Look for price tables/lists
            document.querySelectorAll('.price-item, .ticket-type, [class*="priceRow"], [class*="ticketItem"]').forEach(row => {
                const name = row.querySelector('.name, [class*="name"], [class*="category"]')?.textContent?.trim() || 'Standart';
                const price = row.querySelector('.price, [class*="price"], [class*="amount"]')?.textContent?.trim() || '';
                const status = row.querySelector('[class*="status"], [class*="available"]')?.textContent?.trim();
                if (price && (price.includes('TL') || price.includes('₺'))) {
                    ticketTypes.push({ name, price, status });
                }
            });

            // Single price fallback
            if (ticketTypes.length === 0) {
                const priceEl = document.querySelector('[class*="eventPrice"], [class*="price"]:not(button)');
                if (priceEl) {
                    const price = priceEl.textContent?.trim();
                    if (price && (price.includes('TL') || price.includes('₺'))) {
                        ticketTypes.push({ name: 'Standart', price });
                    }
                }
            }

            return {
                title,
                description,
                imageUrl,
                venueName,
                address,
                startDateMeta,
                endDateMeta,
                dateText,
                rules,
                ticketTypes
            };
        });

        if (!eventInfo.title) {
            console.warn(`[Passo] No title found for ${url}`);
            await page.close();
            return null;
        }

        // Normalize dates
        const startTime = normalizeDate(eventInfo.startDateMeta || '') || new Date().toISOString();
        const endTime = eventInfo.endDateMeta ? normalizeDate(eventInfo.endDateMeta) : null;

        const event: Event = {
            title: eventInfo.title,
            venue_name: eventInfo.venueName || 'Bilinmiyor',
            address: eventInfo.address,
            start_time: startTime,
            end_time: endTime,
            description: eventInfo.description,
            image_url: eventInfo.imageUrl,
            source_url: url,
            category: category,
            rules: eventInfo.rules,
            ticket_details: eventInfo.ticketTypes,
            is_approved: false
        };

        await page.close();
        return event;

    } catch (e) {
        console.error(`[Passo] Error scraping ${url}:`, e);
        await page.close();
        return null;
    }
}

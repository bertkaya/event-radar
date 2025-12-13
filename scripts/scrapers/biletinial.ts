
import { Scraper, Event, TicketDetail } from './types.js';
import { getBrowser, normalizeDate, sleep, dismissPopups, safeNavigate } from './utils.js';

// All Biletinial category URLs with proper category mapping
const BILETINIAL_CATEGORIES = [
    // Ana Kategoriler
    { url: 'https://biletinial.com/tr-tr/tiyatro/', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/muzik/', category: 'Müzik' },
    { url: 'https://biletinial.com/tr-tr/futbol', category: 'Spor' },
    { url: 'https://biletinial.com/tr-tr/etkinlikleri/stand-up', category: 'Stand-Up' },
    { url: 'https://biletinial.com/tr-tr/spor', category: 'Spor' },
    { url: 'https://biletinial.com/tr-tr/opera-bale/', category: 'Sanat' },
    { url: 'https://biletinial.com/tr-tr/etkinlikleri/senfoni-etkinlikleri', category: 'Müzik' },
    { url: 'https://biletinial.com/tr-tr/gosteri/', category: 'Sanat' },
    { url: 'https://biletinial.com/tr-tr/egitim/', category: 'Eğitim' },
    { url: 'https://biletinial.com/tr-tr/seminer/', category: 'Eğitim' },
    { url: 'https://biletinial.com/tr-tr/etkinlik/', category: 'Festival' },
    { url: 'https://biletinial.com/tr-tr/eglence/', category: 'Parti' },
    { url: 'https://biletinial.com/tr-tr/kids', category: 'Aile' },
    // Özel Etkinlikler
    { url: 'https://biletinial.com/tr-tr/etkinlikleri/cso-ada-etkinlikleri', category: 'Müzik' },
    { url: 'https://biletinial.com/tr-tr/etkinlikleri/istanbul-akm-etkinlikleri', category: 'Sanat' },
    { url: 'https://biletinial.com/tr-tr/etkinlikleri/turkiye-kultur-yolu-festivalleri', category: 'Festival' },
    // Şehir Tiyatroları
    { url: 'https://biletinial.com/tr-tr/mekan/istanbul-bb-sehir-tiyatrolari', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/abb-sehir-tiyatrolari', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/bursa-buyuksehir-belediyesi-sehir-tiyatrosu', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/antalya-buyuksehir-belediyesi-sehir-tiyatrolari', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/gaziantep-bb-sehir-tytrosu', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/kocaeli-buyuksehir-belediyesi-sehir-tiyatrolari', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/manisa-buyuksehir-belediyesi-sehir-tiyatrosu', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/amed-sehir-tiyatrosu', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/eskisehirde-sehir-tiyatrolari', category: 'Tiyatro' },
    { url: 'https://biletinial.com/tr-tr/mekan/tekirdag-buyuksehir-belediyesi-yilmaz-icoz-sahnesi', category: 'Tiyatro' },
];

export const BiletinialScraper: Scraper = {
    name: 'Biletinial',
    async scrape(): Promise<Event[]> {
        console.log('[Biletinial] Starting comprehensive scrape...');
        const browser = await getBrowser();
        const events: Event[] = [];
        const processedUrls = new Set<string>();

        for (const catInfo of BILETINIAL_CATEGORIES) {
            console.log(`\n[Biletinial] Category: ${catInfo.category} - ${catInfo.url}`);
            const page = await browser.newPage();

            try {
                // Navigate with popup handling
                await safeNavigate(page, catInfo.url);
                await sleep(2000);

                // Scroll to load more events
                for (let i = 0; i < 3; i++) {
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await sleep(1000);
                }

                // Find event links on the category page
                const eventLinks = await page.evaluate(() => {
                    const links: string[] = [];
                    const categoryPaths = ['/tiyatro/', '/muzik/', '/spor/', '/kids/', '/opera-bale/', '/stand-up/', '/eglence/', '/egitim/', '/seminer/', '/etkinlik/', '/gosteri/'];

                    // Get all links on the page
                    document.querySelectorAll('a[href*="biletinial.com"]').forEach(a => {
                        const href = (a as HTMLAnchorElement).href;
                        if (!href || href.includes('#')) return;

                        // Check if it's an event link in any category
                        for (const catPath of categoryPaths) {
                            if (href.includes(catPath)) {
                                // Get the path after the category
                                const parts = href.split(catPath);
                                if (parts.length > 1 && parts[1] && parts[1].length > 0) {
                                    // It has something after category path = it's an event
                                    const eventSlug = parts[1].split('/')[0].split('?')[0];
                                    if (eventSlug && eventSlug.length > 3 && !eventSlug.includes('biletleri')) {
                                        if (!links.includes(href)) {
                                            links.push(href);
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    });

                    // Also try data attributes
                    document.querySelectorAll('[data-url], [data-href]').forEach(el => {
                        const url = el.getAttribute('data-url') || el.getAttribute('data-href');
                        if (url && url.includes('biletinial.com') && !links.includes(url)) {
                            links.push(url.startsWith('http') ? url : 'https://biletinial.com' + url);
                        }
                    });

                    return [...new Set(links)];
                });

                console.log(`[Biletinial] Found ${eventLinks.length} event links in ${catInfo.category}`);

                // Process each event (limit to 25 per category for speed)
                for (const eventUrl of eventLinks.slice(0, 25)) {
                    if (processedUrls.has(eventUrl)) continue;
                    processedUrls.add(eventUrl);

                    const eventData = await scrapeEventDetail(browser, eventUrl, catInfo.category);
                    if (eventData) {
                        events.push(eventData);
                        console.log(`[Biletinial] ✓ Scraped: ${eventData.title}`);
                    }

                    await sleep(800); // Reduced delay for speed
                }

            } catch (e) {
                console.error(`[Biletinial] Error in category ${catInfo.category}:`, e);
            } finally {
                await page.close();
            }
        }

        console.log(`\n[Biletinial] Total scraped: ${events.length} events`);
        return events;
    }
};

async function scrapeEventDetail(browser: any, url: string, category: string): Promise<Event | null> {
    const page = await browser.newPage();

    try {
        await safeNavigate(page, url);
        await sleep(2000);

        // Dismiss any popups that appeared
        await dismissPopups(page);

        // Click on "Detay" tab if present
        try {
            const detailTab = await page.$('button:has-text("Detay"), [class*="detail-tab"], a:has-text("Detay")');
            if (detailTab) {
                await detailTab.click();
                await sleep(1000);
            }
        } catch (e) { }

        // Extract all event information
        const eventInfo = await page.evaluate(() => {
            const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';
            const getMeta = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';

            // Title
            const title = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('.event-title')?.textContent?.trim() ||
                document.querySelector('[class*="title"]')?.textContent?.trim() ||
                getMeta('og:title');

            // Description from Detay section
            const description = document.querySelector('.event-description')?.innerHTML?.trim() ||
                document.querySelector('[class*="detail-content"]')?.innerHTML?.trim() ||
                document.querySelector('[class*="description"]')?.innerHTML?.trim() ||
                getMeta('og:description') || '';

            // Image (poster)
            const imageUrl = getMeta('og:image') ||
                document.querySelector('.event-poster img')?.getAttribute('src') ||
                document.querySelector('[class*="poster"] img')?.getAttribute('src') ||
                document.querySelector('.event-image img')?.getAttribute('src') || '';

            // Venue
            const venueName = document.querySelector('.venue-name')?.textContent?.trim() ||
                document.querySelector('[class*="venue"]')?.textContent?.trim() ||
                document.querySelector('[class*="mekan"]')?.textContent?.trim() || '';

            const address = document.querySelector('.venue-address')?.textContent?.trim() ||
                document.querySelector('[class*="address"]')?.textContent?.trim() || '';

            // Date/Time
            const startDateMeta = document.querySelector('meta[itemprop="startDate"]')?.getAttribute('content');
            const endDateMeta = document.querySelector('meta[itemprop="endDate"]')?.getAttribute('content');

            // Also try to find date in page content
            const dateText = document.querySelector('.event-date')?.textContent?.trim() ||
                document.querySelector('[class*="date"]')?.textContent?.trim() || '';

            // Price - look for ticket info
            const priceText = document.querySelector('.event-price')?.textContent?.trim() ||
                document.querySelector('[class*="price"]')?.textContent?.trim() ||
                document.querySelector('[class*="fiyat"]')?.textContent?.trim() || '';

            // Multiple ticket types
            const ticketTypes: { name: string; price: string; status?: string }[] = [];
            document.querySelectorAll('.ticket-type, .price-item, [class*="ticket-row"]').forEach(row => {
                const name = row.querySelector('.name, [class*="name"]')?.textContent?.trim() || 'Standart';
                const price = row.querySelector('.price, [class*="price"]')?.textContent?.trim() || '';
                if (price && price.includes('TL')) {
                    ticketTypes.push({ name, price });
                }
            });

            // If no ticket types found, use single price
            if (ticketTypes.length === 0 && priceText && priceText.includes('TL')) {
                ticketTypes.push({ name: 'Standart', price: priceText });
            }

            // Rules/Notes
            const rules: string[] = [];
            document.querySelectorAll('[class*="rule"] li, [class*="note"] li, [class*="uyari"] li').forEach(li => {
                const text = li.textContent?.trim();
                if (text) rules.push(text);
            });

            return {
                title,
                description,
                imageUrl,
                venueName,
                address,
                startDateMeta,
                endDateMeta,
                dateText,
                priceText,
                ticketTypes,
                rules
            };
        });

        if (!eventInfo.title) {
            console.warn(`[Biletinial] No title found for ${url}`);
            await page.close();
            return null;
        }

        // Normalize dates
        const startTime = normalizeDate(eventInfo.startDateMeta || '') || new Date().toISOString();
        const endTime = eventInfo.endDateMeta ? (normalizeDate(eventInfo.endDateMeta) || undefined) : undefined;

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
        console.error(`[Biletinial] Error scraping ${url}:`, e);
        await page.close();
        return null;
    }
}


import { Scraper, Event, TicketDetail } from './types.js';
import { getBrowser, normalizeDate, sleep, dismissPopups, safeNavigate } from './utils.js';
import { Page } from 'puppeteer';

// All Biletix category URLs with proper category mapping
const BILETIX_CATEGORIES = [
    // Spor
    { url: 'https://www.biletix.com/football/TURKIYE/tr', category: 'Spor' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:basketbol$SPORT&qt=standard', category: 'Spor' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:voleybol$SPORT&qt=standard', category: 'Spor' },
    // Müzik
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:pop$MUSIC&qt=standard', category: 'Müzik' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:rock$MUSIC&qt=standard', category: 'Müzik' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:jazz$MUSIC&qt=standard', category: 'Müzik' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:klasik$MUSIC&qt=standard', category: 'Müzik' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:alternatif$MUSIC&qt=standard', category: 'Müzik' },
    // Sanat
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:tiyatro$ART&qt=standard', category: 'Tiyatro' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:gosteri$ART&qt=standard', category: 'Sanat' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:bale_dans$ART&qt=standard', category: 'Sanat' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:stand_up$ART&qt=standard', category: 'Stand-Up' },
    // Aile
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:gosteri$FAMILY&qt=standard', category: 'Aile' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:sirk$FAMILY&qt=standard', category: 'Aile' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:tiyatro$FAMILY&qt=standard', category: 'Aile' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:musical$FAMILY&qt=standard', category: 'Aile' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:zoo$FAMILY&qt=standard', category: 'Aile' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:themepark$FAMILY&qt=standard', category: 'Aile' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#subcategory:attractioncenter$FAMILY&qt=standard', category: 'Aile' },
    // Diğer
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:egitim$OTHER', category: 'Eğitim' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:atolye$OTHER', category: 'Eğitim' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:muze$OTHER', category: 'Sanat' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:mebonayliegitim$OTHER', category: 'Eğitim' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:sergi$OTHER', category: 'Sanat' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:sosyal_sorumluluk$OTHER', category: 'Diğer' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:konferans$OTHER', category: 'Eğitim' },
    { url: 'https://www.biletix.com/search/TURKIYE/tr#!subcat_sb:fuar$OTHER', category: 'Diğer' },
];

export const BiletixScraper: Scraper = {
    name: 'Biletix',
    async scrape(): Promise<Event[]> {
        console.log('[Biletix] Starting comprehensive scrape...');
        const browser = await getBrowser();
        const events: Event[] = [];
        const processedUrls = new Set<string>();

        for (const catInfo of BILETIX_CATEGORIES) {
            console.log(`\n[Biletix] Category: ${catInfo.category} - ${catInfo.url}`);
            const page = await browser.newPage();

            try {
                // Navigate with popup handling
                await safeNavigate(page, catInfo.url);
                await sleep(3000); // Extra wait for JS

                // Scroll to load more events
                for (let i = 0; i < 5; i++) {
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await sleep(1000);
                }

                // Find event links - look for "Satışta" buttons or event cards
                const eventLinks = await page.evaluate(() => {
                    const links: string[] = [];

                    // Method 1: Direct event links
                    document.querySelectorAll('a[href*="/etkinlik/"]').forEach(a => {
                        const href = (a as HTMLAnchorElement).href;
                        if (href && !href.includes('#') && !links.includes(href)) {
                            links.push(href);
                        }
                    });

                    // Method 2: Cards with data-link
                    document.querySelectorAll('[data-link*="/etkinlik/"]').forEach(el => {
                        const link = el.getAttribute('data-link');
                        if (link && !links.includes(link)) {
                            links.push(link.startsWith('http') ? link : 'https://www.biletix.com' + link);
                        }
                    });

                    // Method 3: Event cards with onclick
                    document.querySelectorAll('[onclick*="/etkinlik/"]').forEach(el => {
                        const onclick = el.getAttribute('onclick') || '';
                        const match = onclick.match(/\/etkinlik\/[^'"]+/);
                        if (match) {
                            links.push('https://www.biletix.com' + match[0]);
                        }
                    });

                    return [...new Set(links)];
                });

                console.log(`[Biletix] Found ${eventLinks.length} event links in ${catInfo.category}`);

                // Process each event (limit to 10 per category to avoid overload)
                for (const eventUrl of eventLinks.slice(0, 10)) {
                    if (processedUrls.has(eventUrl)) continue;
                    processedUrls.add(eventUrl);

                    const eventData = await scrapeEventDetail(browser, eventUrl, catInfo.category);
                    if (eventData) {
                        events.push(eventData);
                        console.log(`[Biletix] ✓ Scraped: ${eventData.title}`);
                    }

                    await sleep(1500); // Politeness delay
                }

            } catch (e) {
                console.error(`[Biletix] Error in category ${catInfo.category}:`, e);
            } finally {
                await page.close();
            }
        }

        console.log(`\n[Biletix] Total scraped: ${events.length} events`);
        return events;
    }
};

async function scrapeEventDetail(browser: any, url: string, category: string): Promise<Event | null> {
    const page = await browser.newPage();

    try {
        await safeNavigate(page, url);
        await sleep(2000);

        // Basic info extraction
        const basicInfo = await page.evaluate(() => {
            const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';
            const getMeta = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';

            return {
                title: document.querySelector('h1')?.textContent?.trim() ||
                    document.querySelector('.event-title')?.textContent?.trim() ||
                    getMeta('og:title'),
                description: document.querySelector('.event-description')?.innerHTML?.trim() ||
                    document.querySelector('#tab_aciklama')?.innerHTML?.trim() ||
                    document.querySelector('[class*="description"]')?.innerHTML?.trim() || '',
                imageUrl: getMeta('og:image') ||
                    document.querySelector('.event-image img')?.getAttribute('src') || '',
                venueName: document.querySelector('.venue-name')?.textContent?.trim() ||
                    document.querySelector('.place-name')?.textContent?.trim() ||
                    document.querySelector('[class*="venue"]')?.textContent?.trim() || '',
                address: document.querySelector('.venue-address')?.textContent?.trim() ||
                    document.querySelector('[class*="address"]')?.textContent?.trim() || ''
            };
        });

        if (!basicInfo.title) {
            console.warn(`[Biletix] No title found for ${url}`);
            await page.close();
            return null;
        }

        // Try to click "Etkinlikleri Listele" to get date/venue info
        try {
            const listButton = await page.$('button:has-text("Etkinlikleri Listele"), [class*="list-events"]');
            if (listButton) {
                await listButton.click();
                await sleep(1500);
            }
        } catch (e) { }

        // Extract date from meta or page
        const dateInfo = await page.evaluate(() => {
            const startMeta = document.querySelector('meta[itemprop="startDate"]')?.getAttribute('content');
            const endMeta = document.querySelector('meta[itemprop="endDate"]')?.getAttribute('content');

            // Also try to find date text
            const dateText = document.querySelector('.event-date')?.textContent?.trim() ||
                document.querySelector('[class*="date"]')?.textContent?.trim() || '';

            return { startMeta, endMeta, dateText };
        });

        // Extract rules (Good to Know)
        const rules = await page.evaluate(() => {
            const ruleItems: string[] = [];

            // Tab kurallar
            document.querySelectorAll('#tab_kurallar li, .rules li, [class*="rule"] li').forEach(li => {
                const text = li.textContent?.trim();
                if (text) ruleItems.push(text);
            });

            // Good to know section
            document.querySelectorAll('[class*="good-to-know"] li, [class*="bilgi"] li').forEach(li => {
                const text = li.textContent?.trim();
                if (text && !ruleItems.includes(text)) ruleItems.push(text);
            });

            return ruleItems;
        });

        // Try to click "Standart Bilet Fiyatlarını Gör" for ticket prices
        let ticketDetails: TicketDetail[] = [];
        try {
            const priceButton = await page.$('button:has-text("Bilet Fiyatlarını Gör"), button:has-text("Fiyatları Gör"), [class*="price-button"]');
            if (priceButton) {
                await priceButton.click();
                await sleep(1500);
            }

            ticketDetails = await page.evaluate(() => {
                const tickets: { name: string; price: string; status?: string }[] = [];

                // Price table rows
                document.querySelectorAll('.price-row, .ticket-row, [class*="price-item"], [class*="ticket-type"]').forEach(row => {
                    const name = row.querySelector('.name, .title, [class*="name"]')?.textContent?.trim() || 'Standart';
                    const price = row.querySelector('.price, .amount, [class*="price"]')?.textContent?.trim() || '';
                    const status = row.querySelector('.status, [class*="status"]')?.textContent?.trim();
                    if (price) tickets.push({ name, price, status });
                });

                // Alternative: Single price display
                if (tickets.length === 0) {
                    const priceEl = document.querySelector('.event-price, [class*="price"]:not([class*="button"])');
                    if (priceEl) {
                        const price = priceEl.textContent?.trim();
                        if (price && price.includes('TL')) {
                            tickets.push({ name: 'Standart', price });
                        }
                    }
                }

                return tickets;
            });
        } catch (e) { }

        // Build the event object
        const startTime = normalizeDate(dateInfo.startMeta || '') || new Date().toISOString();
        const endTime = dateInfo.endMeta ? (normalizeDate(dateInfo.endMeta) || undefined) : undefined;

        const event: Event = {
            title: basicInfo.title,
            venue_name: basicInfo.venueName || 'Bilinmiyor',
            address: basicInfo.address,
            start_time: startTime,
            end_time: endTime,
            description: basicInfo.description,
            image_url: basicInfo.imageUrl,
            source_url: url,
            category: category,
            rules: rules,
            ticket_details: ticketDetails,
            is_approved: false
        };

        await page.close();
        return event;

    } catch (e) {
        console.error(`[Biletix] Error scraping ${url}:`, e);
        await page.close();
        return null;
    }
}

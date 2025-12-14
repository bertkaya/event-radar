import { Scraper, Event, TicketDetail } from './types';
import { getBrowser, normalizeDate, sleep, dismissPopups, safeNavigate, autoScroll } from './utils';

// Bubilet şehir sayfaları - Ana kategorilere göre
const BUBILET_CITIES = [
    { url: 'https://www.bubilet.com.tr/ankara', city: 'Ankara' },
    { url: 'https://www.bubilet.com.tr/istanbul', city: 'İstanbul' },
    { url: 'https://www.bubilet.com.tr/izmir', city: 'İzmir' },
    { url: 'https://www.bubilet.com.tr/antalya', city: 'Antalya' },
    { url: 'https://www.bubilet.com.tr/bursa', city: 'Bursa' },
];

// Kategori eşleştirme
const CATEGORY_MAP: { [key: string]: string } = {
    'konser': 'Müzik',
    'tiyatro': 'Tiyatro',
    'stand-up': 'Stand-Up',
    'stand up': 'Stand-Up',
    'bale': 'Sanat',
    'opera': 'Sanat',
    'dans': 'Sanat',
    'gösteri': 'Sanat',
    'festival': 'Festival',
    'parti': 'Parti',
    'dj': 'Parti',
    'çocuk': 'Aile',
    'aile': 'Aile',
    'spor': 'Spor',
    'müzikal': 'Tiyatro',
    'workshop': 'Eğitim',
    'seminer': 'Eğitim',
};

function detectCategory(title: string, description: string, tags: string[]): string {
    const text = (title + ' ' + description + ' ' + tags.join(' ')).toLowerCase();

    for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
        if (text.includes(keyword)) {
            return category;
        }
    }

    // Default to Müzik if "konser" is in title
    if (text.includes('konser')) return 'Müzik';

    return 'Sanat'; // Default category
}

export const BubiletScraper: Scraper = {
    name: 'Bubilet',
    async scrape(): Promise<Event[]> {
        console.log('[Bubilet] Starting comprehensive scrape...');
        const browser = await getBrowser();
        const events: Event[] = [];
        const processedUrls = new Set<string>();

        for (const cityInfo of BUBILET_CITIES) {
            console.log(`\n[Bubilet] City: ${cityInfo.city} - ${cityInfo.url}`);
            const page = await browser.newPage();

            try {
                // Navigate to city page
                await safeNavigate(page, cityInfo.url);
                await dismissPopups(page);
                await sleep(2000);

                // Scroll to load more events
                await autoScroll(page);
                await sleep(1000);

                // Find event links on the page
                const eventLinks = await page.evaluate(() => {
                    const links: string[] = [];

                    // Find all event links - bubilet uses /etkinlik/ path
                    document.querySelectorAll('a[href*="/etkinlik/"]').forEach(a => {
                        const href = (a as HTMLAnchorElement).href;
                        if (!href || href.includes('#') || href.includes('/seans/')) return;

                        // Skip if it's just the base etkinlik page
                        const parts = href.split('/etkinlik/');
                        if (parts.length > 1 && parts[1] && parts[1].length > 0) {
                            const slug = parts[1].split('/')[0].split('?')[0];
                            if (slug && slug.length > 3) {
                                if (!links.includes(href)) {
                                    links.push(href);
                                }
                            }
                        }
                    });

                    return [...new Set(links)];
                });

                console.log(`[Bubilet] Found ${eventLinks.length} event links in ${cityInfo.city}`);

                // Process each event (limit to 30 per city for speed)
                for (const eventUrl of eventLinks.slice(0, 30)) {
                    if (processedUrls.has(eventUrl)) continue;
                    processedUrls.add(eventUrl);

                    const eventData = await scrapeEventDetail(browser, eventUrl, cityInfo.city);
                    if (eventData) {
                        events.push(eventData);
                        console.log(`[Bubilet] ✓ Scraped: ${eventData.title}`);
                    }

                    await sleep(800); // Delay between requests
                }

            } catch (e) {
                console.error(`[Bubilet] Error in city ${cityInfo.city}:`, e);
            } finally {
                await page.close();
            }
        }

        console.log(`\n[Bubilet] Total scraped: ${events.length} events`);
        return events;
    }
};

async function scrapeEventDetail(browser: any, url: string, city: string): Promise<Event | null> {
    const page = await browser.newPage();

    try {
        await safeNavigate(page, url);
        await sleep(2000);

        // Dismiss any popups
        await dismissPopups(page);

        // Extract event information
        const eventInfo = await page.evaluate(() => {
            const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';
            const getMeta = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';
            const getMetaName = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';

            // Title - usually in h1 or h2
            const title = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('h2')?.textContent?.trim() ||
                getMeta('og:title') ||
                document.title.split('|')[0].trim();

            // Description
            const description = getMeta('og:description') ||
                getMetaName('description') ||
                document.querySelector('.event-description, [class*="description"], [class*="about"]')?.textContent?.trim() || '';

            // Image
            const imageUrl = getMeta('og:image') ||
                document.querySelector('.event-image img, .event-poster img, [class*="poster"] img')?.getAttribute('src') ||
                document.querySelector('img[alt*="etkinlik"], img[alt*="konser"]')?.getAttribute('src') || '';

            // Venue - look for venue links or elements
            let venueName = '';
            let venueAddress = '';

            // Try venue link
            const venueLink = document.querySelector('a[href*="/mekan/"]');
            if (venueLink) {
                venueName = venueLink.textContent?.trim() || '';
            }

            // Try structured data
            const venueEl = document.querySelector('[class*="venue"], [class*="mekan"], [class*="location"]');
            if (venueEl && !venueName) {
                venueName = venueEl.textContent?.trim() || '';
            }

            // Try to find address from Google Maps link
            const mapsLink = document.querySelector('a[href*="google.com/maps"]');
            if (mapsLink) {
                const href = mapsLink.getAttribute('href') || '';
                // Extract coordinates if available
                const coordMatch = href.match(/destination=([0-9.-]+),([0-9.-]+)/);
                if (coordMatch) {
                    venueAddress = `${coordMatch[1]},${coordMatch[2]}`;
                }
            }

            // Date/Time - look for session/seans links with date info
            const seansLinks = document.querySelectorAll('a[href*="/seans/"]');
            const sessions: { date: string; time: string; price: string; url: string }[] = [];

            seansLinks.forEach(link => {
                const parent = link.closest('div, li, article');
                if (parent) {
                    const text = parent.textContent || '';
                    // Extract date patterns like "24 Aralık", "13 Ocak Sal - 21:00"
                    const dateMatch = text.match(/(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?:\s+\w+)?(?:\s+-\s+\d{1,2}:\d{2})?)/i);
                    const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*₺/);

                    sessions.push({
                        date: dateMatch ? dateMatch[1] : '',
                        time: dateMatch ? (text.match(/\d{1,2}:\d{2}/) || [''])[0] : '',
                        price: priceMatch ? priceMatch[1] + ' TL' : '',
                        url: (link as HTMLAnchorElement).href
                    });
                }
            });

            // Price - look for price text on page
            let priceText = '';
            const priceElements = document.querySelectorAll('[class*="price"], [class*="fiyat"]');
            priceElements.forEach(el => {
                const text = el.textContent?.trim() || '';
                if (text.includes('₺') || text.includes('TL')) {
                    if (!priceText) priceText = text;
                }
            });

            // Also check for price in link text
            if (!priceText) {
                const allText = document.body.innerText;
                const priceMatch = allText.match(/(\d+(?:[.,]\d+)?)\s*₺/);
                if (priceMatch) {
                    priceText = priceMatch[1] + ' TL';
                }
            }

            // Tags/Categories
            const tags: string[] = [];
            document.querySelectorAll('a[href*="/etiket/"]').forEach(el => {
                const tag = el.textContent?.trim();
                if (tag) tags.push(tag);
            });

            // Rules
            const rules: string[] = [];
            const rulesSection = document.querySelector('[class*="rule"], [class*="kural"], [class*="uyarı"]');
            if (rulesSection) {
                rulesSection.querySelectorAll('li, p').forEach(li => {
                    const text = li.textContent?.trim();
                    if (text && text.length > 10) rules.push(text);
                });
            }

            return {
                title,
                description,
                imageUrl,
                venueName,
                venueAddress,
                sessions,
                priceText,
                tags,
                rules
            };
        });

        if (!eventInfo.title) {
            console.warn(`[Bubilet] No title found for ${url}`);
            await page.close();
            return null;
        }

        // Parse first session date or generate default
        let startTime = new Date().toISOString();
        let endTime: string | undefined;

        if (eventInfo.sessions && eventInfo.sessions.length > 0) {
            const firstSession = eventInfo.sessions[0];
            const parsedDate = parseTurkishDate(firstSession.date, firstSession.time);
            if (parsedDate) {
                startTime = parsedDate.toISOString();
            }
        }

        // Detect category from tags and title
        const category = detectCategory(eventInfo.title, eventInfo.description, eventInfo.tags);

        // Parse venue coordinates if available
        let lat: number | undefined;
        let lng: number | undefined;
        if (eventInfo.venueAddress && eventInfo.venueAddress.includes(',')) {
            const [latStr, lngStr] = eventInfo.venueAddress.split(',');
            lat = parseFloat(latStr);
            lng = parseFloat(lngStr);
            if (isNaN(lat) || isNaN(lng)) {
                lat = undefined;
                lng = undefined;
            }
        }

        // Build ticket details from sessions
        const ticketDetails: TicketDetail[] = [];
        if (eventInfo.sessions) {
            eventInfo.sessions.forEach((session: any, idx: number) => {
                if (session.price) {
                    ticketDetails.push({
                        name: session.date || `Seans ${idx + 1}`,
                        price: session.price.replace('₺', 'TL'),
                        status: 'available'
                    });
                }
            });
        }

        // Use first price found
        const price = eventInfo.priceText?.replace('₺', 'TL') ||
            (ticketDetails.length > 0 ? ticketDetails[0].price : '');

        const event: Event = {
            title: eventInfo.title,
            venue_name: eventInfo.venueName || city,
            address: city,
            start_time: startTime,
            end_time: endTime,
            description: eventInfo.description,
            image_url: eventInfo.imageUrl,
            source_url: url,
            category: category,
            price: price,
            lat: lat,
            lng: lng,
            rules: eventInfo.rules,
            ticket_details: ticketDetails.length > 0 ? ticketDetails : undefined,
            tags: eventInfo.tags,
            is_approved: false
        };

        await page.close();
        return event;

    } catch (e) {
        console.error(`[Bubilet] Error scraping ${url}:`, e);
        await page.close();
        return null;
    }
}

// Helper function to parse Turkish date formats
function parseTurkishDate(dateStr: string, timeStr?: string): Date | null {
    if (!dateStr) return null;

    const months: { [key: string]: number } = {
        'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
        'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
    };

    try {
        // Parse "24 Aralık" or "13 Ocak Sal"
        const parts = dateStr.toLowerCase().trim().split(/\s+/);
        if (parts.length < 2) return null;

        const day = parseInt(parts[0]);
        const monthName = parts[1];
        const month = months[monthName];

        if (isNaN(day) || month === undefined) return null;

        // Determine year - if month is before current month, use next year
        const now = new Date();
        let year = now.getFullYear();
        if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
            year++;
        }

        // Parse time if available
        let hours = 20; // Default to 20:00
        let minutes = 0;
        if (timeStr) {
            const timeParts = timeStr.split(':');
            if (timeParts.length === 2) {
                hours = parseInt(timeParts[0]) || 20;
                minutes = parseInt(timeParts[1]) || 0;
            }
        }

        return new Date(year, month, day, hours, minutes);
    } catch (e) {
        return null;
    }
}

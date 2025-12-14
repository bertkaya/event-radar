import { Scraper, Event } from './types';
import { sleep } from './utils';

// Bubilet şehir sayfaları
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

function detectCategory(title: string, description: string = ''): string {
    const text = (title + ' ' + description).toLowerCase();

    for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
        if (text.includes(keyword)) {
            return category;
        }
    }

    if (text.includes('konser')) return 'Müzik';
    return 'Sanat';
}

// Turkish month parser
function parseTurkishDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const months: { [key: string]: number } = {
        'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
        'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
    };

    try {
        const parts = dateStr.toLowerCase().trim().split(/\s+/);
        if (parts.length < 2) return null;

        const day = parseInt(parts[0]);
        const monthName = parts[1];
        const month = months[monthName];

        if (isNaN(day) || month === undefined) return null;

        const now = new Date();
        let year = now.getFullYear();
        if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
            year++;
        }

        // Check for time in the string
        const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
        const hours = timeMatch ? parseInt(timeMatch[1]) : 20;
        const minutes = timeMatch ? parseInt(timeMatch[2]) : 0;

        return new Date(year, month, day, hours, minutes);
    } catch (e) {
        return null;
    }
}

export const BubiletScraper: Scraper = {
    name: 'Bubilet',
    async scrape(): Promise<Event[]> {
        console.log('[Bubilet] Starting fetch-based scrape...');
        const events: Event[] = [];
        const processedUrls = new Set<string>();

        for (const cityInfo of BUBILET_CITIES) {
            console.log(`\n[Bubilet] City: ${cityInfo.city} - ${cityInfo.url}`);

            try {
                // Fetch city page with proper headers
                const response = await fetch(cityInfo.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
                        'Cache-Control': 'no-cache',
                    }
                });

                if (!response.ok) {
                    console.error(`[Bubilet] Failed to fetch ${cityInfo.url}: ${response.status}`);
                    continue;
                }

                const html = await response.text();
                console.log(`[Bubilet] Got ${html.length} chars from ${cityInfo.city}`);

                // Extract event links using regex
                const linkRegex = /href="([^"]*\/etkinlik\/[^"]+)"/g;
                const eventLinks: string[] = [];
                let match;

                while ((match = linkRegex.exec(html)) !== null) {
                    let href = match[1];

                    // Skip seans links
                    if (href.includes('/seans/')) continue;

                    // Build full URL
                    if (href.startsWith('/')) {
                        href = 'https://www.bubilet.com.tr' + href;
                    }

                    // Validate the URL
                    const parts = href.split('/etkinlik/');
                    if (parts.length > 1 && parts[1]) {
                        const slug = parts[1].split('/')[0].split('?')[0];
                        if (slug && slug.length > 2 && !eventLinks.includes(href)) {
                            eventLinks.push(href);
                        }
                    }
                }

                console.log(`[Bubilet] Found ${eventLinks.length} event links in ${cityInfo.city}`);

                // Also extract event info directly from the page
                // Pattern: [Title Venue Date Price](url)
                const eventPattern = /\[([^\]]+)\]\((https:\/\/www\.bubilet\.com\.tr\/[^\/]+\/etkinlik\/[^)]+)\)/g;

                while ((match = eventPattern.exec(html)) !== null) {
                    const infoText = match[1];
                    const eventUrl = match[2];

                    if (processedUrls.has(eventUrl) || eventUrl.includes('/seans/')) continue;
                    processedUrls.add(eventUrl);

                    // Parse the info text (usually: Title Venue Date Price)
                    // Example: "Mabel MatizCongresium Ankara24 Aralık, 25 Aralık2200₺"

                    // Try to extract price
                    const priceMatch = infoText.match(/(\d+(?:[.,]\d+)?)\s*₺/);
                    const price = priceMatch ? priceMatch[1] + ' TL' : '';

                    // Try to extract date
                    const dateMatch = infoText.match(/(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?:\s*,?\s*\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık))?(?:\s+\w{3})?\s*(?:-\s*\d{1,2}:\d{2})?)/i);

                    let startTime = new Date();
                    startTime.setHours(20, 0, 0, 0);

                    if (dateMatch) {
                        const parsed = parseTurkishDate(dateMatch[1]);
                        if (parsed) startTime = parsed;
                    }

                    // Extract title (everything before the venue/date)
                    let title = infoText;
                    if (priceMatch) title = title.replace(priceMatch[0], '');
                    if (dateMatch) title = title.replace(dateMatch[0], '');
                    title = title.replace(/\d+₺/g, '').trim();

                    // Get slug for better title
                    const slug = eventUrl.split('/etkinlik/')[1]?.split('/')[0] || '';
                    const slugTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    if (!title || title.length < 3) {
                        title = slugTitle;
                    }

                    const event: Event = {
                        title: title,
                        venue_name: cityInfo.city,
                        address: cityInfo.city,
                        start_time: startTime.toISOString(),
                        description: '',
                        image_url: '',
                        source_url: eventUrl,
                        category: detectCategory(title),
                        price: price,
                        is_approved: false
                    };

                    events.push(event);
                    console.log(`[Bubilet] ✓ Extracted: ${event.title} (${price})`);
                }

                // If no events found from pattern, try to scrape detail pages
                if (events.filter(e => e.address === cityInfo.city).length === 0) {
                    console.log(`[Bubilet] No quick events found, trying detail pages...`);

                    for (const eventUrl of eventLinks.slice(0, 15)) {
                        if (processedUrls.has(eventUrl)) continue;
                        processedUrls.add(eventUrl);

                        try {
                            const eventData = await scrapeEventDetailFetch(eventUrl, cityInfo.city);
                            if (eventData) {
                                events.push(eventData);
                                console.log(`[Bubilet] ✓ Scraped: ${eventData.title}`);
                            }
                        } catch (e) {
                            console.error(`[Bubilet] Error on ${eventUrl}:`, e);
                        }

                        await sleep(500);
                    }
                }

                await sleep(1000);

            } catch (e) {
                console.error(`[Bubilet] Error in city ${cityInfo.city}:`, e);
            }
        }

        console.log(`\n[Bubilet] Total scraped: ${events.length} events`);
        return events;
    }
};

async function scrapeEventDetailFetch(url: string, city: string): Promise<Event | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
            }
        });

        if (!response.ok) return null;

        const html = await response.text();

        // Extract title from og:title or <title>
        let title = '';
        const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

        if (ogTitleMatch) {
            title = ogTitleMatch[1].split('|')[0].trim();
        } else if (titleMatch) {
            title = titleMatch[1].split('|')[0].trim();
        }

        if (!title || title.length < 3) return null;

        // Clean title - remove " biletleri" suffix
        title = title.replace(/\s*biletleri?\s*$/i, '').trim();

        // Extract description from og:description
        let description = '';
        const descMatch = html.match(/<meta\s+(?:property="og:description"|name="description")\s+content="([^"]+)"/i);
        if (descMatch) {
            description = descMatch[1];
        }

        // Extract image from og:image
        let imageUrl = '';
        const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (imgMatch) {
            imageUrl = imgMatch[1];
        }

        // Extract price
        let price = '';
        const priceMatch = html.match(/(\d+(?:[.,]\d+)?)\s*₺/);
        if (priceMatch) {
            price = priceMatch[1] + ' TL';
        }

        // Extract date
        let startTime = new Date();
        startTime.setHours(20, 0, 0, 0);

        const dateMatch = html.match(/(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?:\s+\w{3})?(?:\s+-\s+\d{1,2}:\d{2})?)/i);
        if (dateMatch) {
            const parsed = parseTurkishDate(dateMatch[1]);
            if (parsed) startTime = parsed;
        }

        // Extract venue from page
        let venueName = city;
        const venueMatch = html.match(/<a[^>]+href="[^"]*\/mekan\/[^"]*"[^>]*>([^<]+)<\/a>/i);
        if (venueMatch) {
            venueName = venueMatch[1].trim();
        }

        // Extract coordinates from Google Maps link
        let lat: number | undefined;
        let lng: number | undefined;
        let mapsUrl: string | undefined;

        // Pattern 1: destination=lat,lng in Google Maps link
        const mapsDestMatch = html.match(/href="([^"]*google\.com\/maps[^"]*destination=([0-9.-]+),([0-9.-]+)[^"]*)"/i);
        if (mapsDestMatch) {
            mapsUrl = mapsDestMatch[1];
            lat = parseFloat(mapsDestMatch[2]);
            lng = parseFloat(mapsDestMatch[3]);
        }

        // Pattern 2: @lat,lng in Google Maps link
        if (!lat || !lng) {
            const mapsAtMatch = html.match(/href="([^"]*google\.com\/maps[^"]*@([0-9.-]+),([0-9.-]+)[^"]*)"/i);
            if (mapsAtMatch) {
                mapsUrl = mapsAtMatch[1];
                lat = parseFloat(mapsAtMatch[2]);
                lng = parseFloat(mapsAtMatch[3]);
            }
        }

        // Pattern 3: query=lat,lng
        if (!lat || !lng) {
            const mapsQueryMatch = html.match(/href="([^"]*google\.com\/maps[^"]*query=([0-9.-]+),([0-9.-]+)[^"]*)"/i);
            if (mapsQueryMatch) {
                mapsUrl = mapsQueryMatch[1];
                lat = parseFloat(mapsQueryMatch[2]);
                lng = parseFloat(mapsQueryMatch[3]);
            }
        }

        // Extract address from page if available
        let address = city;
        const addressMatch = html.match(/<[^>]+class="[^"]*address[^"]*"[^>]*>([^<]+)<\/[^>]+>/i);
        if (addressMatch) {
            address = addressMatch[1].trim();
        }

        // Ticket sources - include this source
        const ticketSources = [{
            source: 'bubilet',
            url: url,
            price: price
        }];

        return {
            title: title,
            venue_name: venueName,
            address: address,
            start_time: startTime.toISOString(),
            description: description,
            image_url: imageUrl,
            source_url: url,
            category: detectCategory(title, description),
            price: price,
            lat: lat,
            lng: lng,
            maps_url: mapsUrl,
            ticket_sources: ticketSources,
            is_approved: false
        };

    } catch (e) {
        console.error(`[Bubilet] Error fetching ${url}:`, e);
        return null;
    }
}

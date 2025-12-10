
import * as cheerio from 'cheerio';
import { Scraper, Event } from './types.js';
import { normalizeDate, sleep } from './utils.js';

export const LavarlaScraper: Scraper = {
    name: 'Lavarla',
    async scrape(): Promise<Event[]> {
        console.log('[Lavarla] Starting scrape...');
        const events: Event[] = [];

        try {
            // 1. Get Sitemap
            const sitemapRes = await fetch('https://lavarla.com/ajde_events-sitemap.xml', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 ' }
            });
            if (!sitemapRes.ok) throw new Error(`Sitemap fetch failed: ${sitemapRes.status}`);
            const xml = await sitemapRes.text();
            const $map = cheerio.load(xml, { xmlMode: true });

            const urls: string[] = [];
            $map('loc').each((i: any, el: any) => {
                const u = $map(el).text();
                if (u !== 'https://lavarla.com/etkinlik/' && !u.includes('/page/')) urls.push(u);
            });

            console.log(`[Lavarla] Found ${urls.length} events in sitemap. Processing first 15...`);

            // 2. Process URLs
            for (const url of urls.slice(0, 15)) {
                await sleep(500); // Politeness delay
                try {
                    const pageRes = await fetch(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 ' }
                    });

                    if (!pageRes.ok) {
                        console.error(`[Lavarla] Failed to fetch ${url}: ${pageRes.status}`);
                        continue;
                    }
                    const html = await pageRes.text();
                    const $ = cheerio.load(html);

                    // Extract Data
                    const title = $('.evcal_event_title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
                    const startDateMeta = $('meta[itemprop="startDate"]').attr('content');
                    const endDateMeta = $('meta[itemprop="endDate"]').attr('content');

                    if (!title || !startDateMeta) {
                        console.warn(`[Lavarla] Skipping ${url} - Missing title or start date`);
                        continue;
                    }

                    const cleanStart = normalizeDate(startDateMeta);
                    const cleanEnd = normalizeDate(endDateMeta);

                    const startTime = cleanStart ? new Date(cleanStart).toISOString() : '';
                    // If startTime is invalid (empty), skip
                    if (!startTime) continue;

                    const endTime = cleanEnd ? new Date(cleanEnd).toISOString() : undefined;

                    // Venue
                    const venueName = $('.event_location_name').text().trim() || $('.evo_location_name').text().trim() || $('meta[name="og:site_name"]').attr('content') || 'Unknown Venue';
                    const address = $('.evo_location_address').text().trim();

                    // Description & Image
                    const description = $('.eventon_desc_in').html()?.trim() || $('meta[property="og:description"]').attr('content');
                    const imageUrl = $('meta[itemprop="image"]').attr('content') || $('.evocard_main_image').data('f') as string;

                    // Geo
                    let lat: number | undefined;
                    let lng: number | undefined;
                    const latLngData = $('.evcal_location').data('latlng') as string;
                    if (typeof latLngData === 'string' && latLngData.includes(',')) {
                        const parts = latLngData.split(',');
                        lat = parseFloat(parts[0]);
                        lng = parseFloat(parts[1]);
                    }

                    // Construct Event
                    const event: Event = {
                        title,
                        venue_name: venueName,
                        address,
                        start_time: startTime,
                        end_time: endTime,
                        description: description || undefined,
                        image_url: imageUrl,
                        source_url: url,
                        lat,
                        lng,
                        is_approved: false, // Default
                        category: 'Etkinlik',
                        rules: [], // Lavarla doesn't seem to have strict rules block
                        ticket_details: [] // Lavarla is aggregation, usually no direct tickets or just external link
                        // TODO: Extract external ticket link if present
                    };

                    events.push(event);
                    console.log(`[Lavarla] Parsed: ${title}`);

                } catch (e) {
                    console.error(`[Lavarla] Error processing ${url}:`, e);
                }
            }

        } catch (e) {
            console.error('[Lavarla] Fatal error:', e);
        }

        return events;
    }
};

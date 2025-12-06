
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase keys missing. Printing to console instead of DB.');
}

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('Supabase keys missing. Running in SIMULATION MODE.');
}

async function fetchLavarlaEvents() {
    console.log('Starting Lavarla scrape...');

    try {
        // 1. Get Sitemap
        const sitemapRes = await fetch('https://lavarla.com/ajde_events-sitemap.xml', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (!sitemapRes.ok) throw new Error(`Sitemap fetch failed: ${sitemapRes.status}`);
        const xml = await sitemapRes.text();
        const $map = cheerio.load(xml, { xmlMode: true });

        const urls: string[] = [];
        $map('loc').each((i: any, el: any) => {
            const u = $map(el).text();
            if (u !== 'https://lavarla.com/etkinlik/' && !u.includes('/page/')) urls.push(u);
        });

        console.log(`Found ${urls.length} events in sitemap. Processing first 10 for safety...`);

        // 2. Process URLs
        for (const url of urls.slice(0, 10)) {
            console.log(`Fetching '${url}'...`);
            try {
                const pageRes = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
                });

                if (!pageRes.ok) {
                    console.log(`Failed to fetch ${url}: ${pageRes.status}`);
                    continue;
                }
                const html = await pageRes.text();
                const $ = cheerio.load(html);

                // Extract Data
                const title = $('.evcal_event_title').text().trim() || $('meta[property="og:title"]').attr('content');
                const startDateMeta = $('meta[itemprop="startDate"]').attr('content');
                const endDateMeta = $('meta[itemprop="endDate"]').attr('content');

                if (!title || !startDateMeta) {
                    console.warn(`Skipping ${url} - Missing title or start date`);
                    continue;
                }

                // Fix Date Format: 2025-9-23T11:00+3:00 -> 2025-09-23T11:00:00+03:00
                // Also pad single digit month/day
                const normalizeDate = (d: string) => {
                    if (!d) return null;
                    // Fix timezone +3:00 -> +03:00
                    let fixed = d.replace(/\+(\d):/, '+0$1:');

                    // Fix single digit month/day: 2025-9-5T -> 2025-09-05T
                    // Split by T to handle date part
                    const parts = fixed.split('T');
                    if (parts.length > 0) {
                        const dateParts = parts[0].split('-');
                        if (dateParts.length === 3) {
                            const y = dateParts[0];
                            const m = dateParts[1].padStart(2, '0');
                            const day = dateParts[2].padStart(2, '0');
                            parts[0] = `${y}-${m}-${day}`;
                            fixed = parts.join('T');
                        }
                    }
                    return fixed;
                };

                const cleanStart = normalizeDate(startDateMeta);
                const cleanEnd = normalizeDate(endDateMeta);

                let startTime: string | null = null;
                let endTime: string | null = null;
                try {
                    startTime = cleanStart ? new Date(cleanStart).toISOString() : null;
                    endTime = cleanEnd ? new Date(cleanEnd).toISOString() : null;
                } catch (e) {
                    console.warn(`Date parsing failed for ${url} (Meta: ${startDateMeta})`);
                    continue;
                }

                if (!startTime) {
                    console.warn(`Skipping ${url} - Invalid start time`);
                    continue;
                }

                // Venue
                // Try .event_location_name (from dump) then .evo_location_name fallback
                const venueName = $('.event_location_name').text().trim() || $('.evo_location_name').text().trim() || $('meta[name="og:site_name"]').attr('content');
                const address = $('.evo_location_address').text().trim();

                // Description & Image
                const description = $('.eventon_desc_in').text().trim() || $('meta[property="og:description"]').attr('content');
                const imageUrl = $('meta[itemprop="image"]').attr('content') || $('.evocard_main_image').data('f');

                // Category
                const category = 'Etkinlik';

                const eventData = {
                    title,
                    venue_name: venueName,
                    address,
                    start_time: startTime,
                    end_time: endTime,
                    description,
                    image_url: imageUrl,
                    source_url: url,
                    lat: 39.9334,
                    lng: 32.8597,
                    is_approved: true,
                    category: category,
                    price: ''
                };

                // Geo extraction
                const latLngData = $('.evcal_location').data('latlng');
                if (typeof latLngData === 'string' && latLngData.includes(',')) {
                    const parts = latLngData.split(',');
                    eventData.lat = parseFloat(parts[0]);
                    eventData.lng = parseFloat(parts[1]);
                }

                console.log(`Parsed: ${title} @ ${venueName} (${startTime})`);

                // 3. Upsert into Supabase
                if (supabaseUrl && supabaseKey) {
                    const { error } = await supabase
                        .from('events')
                        .upsert(eventData, { onConflict: 'source_url' });

                    const { data: existing } = await supabase.from('events').select('id').eq('source_url', url).single();

                    if (existing) {
                        const { error: updateErr } = await supabase.from('events').update(eventData).eq('id', existing.id);
                        if (updateErr) console.error('Update error:', updateErr);
                        else console.log('Updated existing event.');
                    } else {
                        const { error: insertErr } = await supabase.from('events').insert(eventData);
                        if (insertErr) console.error('Insert error:', insertErr);
                        else console.log('Inserted new event.');
                    }
                } else {
                    console.log('Skipping DB save (no credentials). Data prepared.');
                }

            } catch (e) {
                console.error(`Error processing ${url}:`, e);
            }
        }
    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

fetchLavarlaEvents();

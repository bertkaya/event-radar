
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchLavarlaEvents() {
    console.log('Starting Lavarla scrape (API)...');
    let count = 0;
    const errors: string[] = [];

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

        // Limit for safety/performance in API
        const limitedUrls = urls.slice(0, 10);

        // 2. Process URLs
        for (const url of limitedUrls) {
            try {
                const pageRes = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
                });

                if (!pageRes.ok) continue;
                const html = await pageRes.text();
                const $ = cheerio.load(html);

                // Extract Data
                const title = $('.evcal_event_title').text().trim() || $('meta[property="og:title"]').attr('content');
                const startDateMeta = $('meta[itemprop="startDate"]').attr('content');
                const endDateMeta = $('meta[itemprop="endDate"]').attr('content');

                if (!title || !startDateMeta) continue;

                // Fix Date Format logic (Same as script)
                const normalizeDate = (d: string | undefined) => {
                    if (!d) return null;
                    let fixed = d.replace(/\+(\d):/, '+0$1:');
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
                } catch (e) { continue; }

                if (!startTime) continue;

                const venueName = $('.event_location_name').text().trim() || $('.evo_location_name').text().trim() || $('meta[name="og:site_name"]').attr('content') || 'Bilinmiyor';
                const address = $('.evo_location_address').text().trim();
                const description = $('.eventon_desc_in').text().trim() || $('meta[property="og:description"]').attr('content');
                const imageUrl = $('meta[itemprop="image"]').attr('content') || $('.evocard_main_image').data('f');
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
                    is_approved: false, // Default unapproved for API fetch
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

                // 3. Upsert
                const { error } = await supabase.from('events').upsert(eventData, { onConflict: 'source_url' });
                if (!error) count++;
                else errors.push(error.message);

            } catch (e: any) {
                errors.push(`Error processing ${url}: ${e.message}`);
            }
        }
    } catch (err: any) {
        errors.push('Fatal: ' + err.message);
    }
    return { count, errors };
}

export async function POST() {
    const result = await fetchLavarlaEvents();
    return NextResponse.json({ success: true, count: result.count, errors: result.errors });
}


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { BiletinialScraper } from './scrapers/biletinial.js';
import { PassoScraper } from './scrapers/passo.js';
import { BiletixScraper } from './scrapers/biletix.js';
import { Scraper, Event } from './scrapers/types.js';
import { parsePrice } from './scrapers/utils.js';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase keys missing. Printing to console instead of DB.');
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function saveEvents(events: Event[], source: string) {
    if (!supabase) {
        console.log(`[${source}] Simulation Mode: Would save ${events.length} events.`);
        return;
    }

    console.log(`[${source}] Saving ${events.length} events to DB...`);
    let newCount = 0;
    let updatedCount = 0;

    for (const event of events) {
        try {
            // Basic validation
            if (!event.title || !event.start_time) continue;

            // Prepare payload
            const rulesPayload = Array.isArray(event.rules) ? event.rules.join('\n') : event.rules;

            // Calculate min_price
            let minPrice: number | null = null;
            if (event.ticket_details && event.ticket_details.length > 0) {
                const prices = event.ticket_details
                    .map(t => parsePrice(t.price))
                    .filter(p => p !== null) as number[];

                if (prices.length > 0) {
                    minPrice = Math.min(...prices);
                }
            }

            const payload = {
                ...event,
                rules: rulesPayload,
                min_price: minPrice
            };

            // Upsert
            const { data: existing, error: fetchErr } = await supabase
                .from('events')
                .select('id')
                .eq('source_url', event.source_url)
                .single();

            if (fetchErr && fetchErr.code !== 'PGRST116') { // PGRST116 is 'Row not found'
                console.error(`[${source}] Error checking existence:`, fetchErr);
                continue;
            }

            if (existing) {
                const { error } = await supabase.from('events').update(payload).eq('id', existing.id);
                if (error) console.error(`[${source}] Update failed:`, error);
                else updatedCount++;
            } else {
                const { error } = await supabase.from('events').insert(payload);
                if (error) console.error(`[${source}] Insert failed:`, error);
                else newCount++;
            }

        } catch (e) {
            console.error(`[${source}] Error saving event ${event.title}:`, e);
        }
    }
    console.log(`[${source}] Done. New: ${newCount}, Updated: ${updatedCount}`);
}

async function runAll() {
    const scrapers: Scraper[] = [
        BiletinialScraper,
        PassoScraper,
        BiletixScraper
    ];

    console.log(`Starting ${scrapers.length} scrapers...`);

    // Run sequentially to avoid browser conflicts or memory issues if they all launch Puppeteer
    // Or mostly they launch their own browser instance. Sequential is safer.
    for (const scraper of scrapers) {
        try {
            console.log(`\n--- Running ${scraper.name} ---`);
            const events = await scraper.scrape();
            console.log(`[${scraper.name}] Scraped ${events.length} events.`);
            await saveEvents(events, scraper.name);
        } catch (e) {
            console.error(`[${scraper.name}] Failed:`, e);
        }
    }

    console.log('\nAll scrapers finished.');
    process.exit(0);
}

runAll();

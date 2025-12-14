
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { BiletinialScraper } from './scrapers/biletinial.js';
import { PassoScraper } from './scrapers/passo.js';
import { BiletixScraper } from './scrapers/biletix.js';
import { BubiletScraper } from './scrapers/bubilet.js';
import { Scraper, Event } from './scrapers/types.js';
import { parsePrice } from './scrapers/utils.js';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase keys missing. Printing to console instead of DB.');
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function saveEvents(events: Event[], source: string): Promise<{ new: number, updated: number }> {
    if (!supabase) {
        console.log(`[${source}] Simulation Mode: Would save ${events.length} events.`);
        return { new: 0, updated: 0 };
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
    return { new: newCount, updated: updatedCount };
}

async function logScraperRun(scraperName: string, status: 'running' | 'success' | 'failed', eventsCount: number = 0, errorMsg: string | null = null, durationMs: number = 0) {
    if (!supabase) return;
    try {
        await supabase.from('scraper_logs').insert({
            scraper_name: scraperName,
            status,
            events_count: eventsCount,
            error_message: errorMsg,
            duration_ms: durationMs
        });
    } catch (e) {
        console.error('Failed to log scraper run:', e);
    }
}

async function runScraper(scraper: Scraper): Promise<{ name: string, events: number, duration: number, error?: string }> {
    const startTime = Date.now();
    try {
        console.log(`\n--- Running ${scraper.name} ---`);
        const events = await scraper.scrape();
        console.log(`[${scraper.name}] Scraped ${events.length} events.`);
        await saveEvents(events, scraper.name);
        const duration = Date.now() - startTime;
        await logScraperRun(scraper.name, 'success', events.length, null, duration);
        return { name: scraper.name, events: events.length, duration };
    } catch (e: any) {
        console.error(`[${scraper.name}] Failed:`, e);
        const duration = Date.now() - startTime;
        await logScraperRun(scraper.name, 'failed', 0, e.message || String(e), duration);
        return { name: scraper.name, events: 0, duration, error: e.message };
    }
}

async function runAll() {
    const allScrapers: { [key: string]: Scraper } = {
        'biletinial': BiletinialScraper,
        'passo': PassoScraper,
        'biletix': BiletixScraper,
        'bubilet': BubiletScraper
    };

    // Get scraper names from command line arguments
    const args = process.argv.slice(2).map(a => a.toLowerCase());

    let scrapersToRun: Scraper[];

    if (args.length > 0) {
        // Run only specified scrapers
        scrapersToRun = args
            .filter(name => allScrapers[name])
            .map(name => allScrapers[name]);

        if (scrapersToRun.length === 0) {
            console.log('Available scrapers:', Object.keys(allScrapers).join(', '));
            console.log('Usage: npx tsx scripts/run_scrapers.ts [scraper1] [scraper2] ...');
            process.exit(1);
        }

        console.log(`Running ${scrapersToRun.length} selected scraper(s): ${args.filter(n => allScrapers[n]).join(', ')}`);
    } else {
        // Run all scrapers
        scrapersToRun = Object.values(allScrapers);
        console.log(`Starting ${scrapersToRun.length} scrapers in PARALLEL mode...`);
    }

    const startTime = Date.now();

    // Run scrapers in parallel
    const results = await Promise.all(scrapersToRun.map(s => runScraper(s)));

    const totalDuration = Date.now() - startTime;
    const totalEvents = results.reduce((sum, r) => sum + r.events, 0);

    console.log('\n========== RESULTS ==========');
    results.forEach(r => {
        const status = r.error ? '❌' : '✅';
        console.log(`${status} ${r.name}: ${r.events} events (${(r.duration / 1000).toFixed(1)}s)`);
    });
    console.log(`\nTotal: ${totalEvents} events in ${(totalDuration / 1000).toFixed(1)}s`);
    console.log('All scrapers finished.');
    process.exit(0);
}

runAll();

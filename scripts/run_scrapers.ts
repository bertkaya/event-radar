
import { LavarlaScraper } from './scrapers/lavarla.js';
import { PassoScraper } from './scrapers/passo.js';
import { BiletixScraper } from './scrapers/biletix.js';
import { BiletinialScraper } from './scrapers/biletinial.js';
import { saveEvents, closeBrowser } from './scrapers/utils.js';
import { Scraper } from './scrapers/types.js';

const scrapers: Record<string, Scraper> = {
    'lavarla': LavarlaScraper,
    'passo': PassoScraper,
    'biletix': BiletixScraper,
    'biletinial': BiletinialScraper
};

async function main() {
    const args = process.argv.slice(2);
    const sourceArg = args.find(a => a.startsWith('--source='));

    let invalidSource = false;
    let sourcesToRun: string[] = [];

    if (sourceArg) {
        const sourceName = sourceArg.split('=')[1].toLowerCase();
        if (scrapers[sourceName]) {
            sourcesToRun = [sourceName];
        } else {
            console.error(`Unknown source: ${sourceName}`);
            console.error(`Available sources: ${Object.keys(scrapers).join(', ')}`);
            invalidSource = true;
        }
    } else {
        // Run all
        sourcesToRun = Object.keys(scrapers);
    }

    if (invalidSource) {
        process.exit(1);
    }

    console.log(`Starting Scraper Orchestrator for: ${sourcesToRun.join(', ')}`);

    try {
        for (const name of sourcesToRun) {
            const scraper = scrapers[name];
            try {
                console.log(`\n--- Running ${scraper.name} ---`);
                const events = await scraper.scrape();
                console.log(`[${scraper.name}] Scraped ${events.length} events.`);

                if (events.length > 0) {
                    await saveEvents(events, scraper.name);
                } else {
                    console.log(`[${scraper.name}] No events found or error occurred.`);
                }

            } catch (err) {
                console.error(`[${name}] Failed:`, err);
            }
        }
    } finally {
        // Ensure browser is closed even if errors occur
        console.log('\nClosing resources...');
        await closeBrowser();
        console.log('Done.');
    }
}

main();

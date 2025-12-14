// Test script for running only Bubilet scraper
import { BubiletScraper } from './scrapers/bubilet.js';
import { closeBrowser } from './scrapers/utils.js';

async function testBubilet() {
    console.log('Testing Bubilet Scraper...');
    try {
        const events = await BubiletScraper.scrape();
        console.log(`\n✅ Scraped ${events.length} events from Bubilet`);

        // Show first 5 events
        events.slice(0, 5).forEach((event, idx) => {
            console.log(`\n--- Event ${idx + 1} ---`);
            console.log(`Title: ${event.title}`);
            console.log(`Venue: ${event.venue_name}`);
            console.log(`Date: ${event.start_time}`);
            console.log(`Price: ${event.price}`);
            console.log(`Category: ${event.category}`);
        });
    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        await closeBrowser();
        process.exit(0);
    }
}

testBubilet();

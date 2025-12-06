
import * as cheerio from 'cheerio';

async function debugScrape() {
    const url = 'https://lavarla.com/etkinlik/yasanmamis-tarihe-notlar/';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    console.log('Title (selector .evcal_event_title):', $('.evcal_event_title').text());
    console.log('Title (meta og:title):', $('meta[property="og:title"]').attr('content'));

    console.log('StartDate (meta itemprop=startDate):', $('meta[itemprop="startDate"]').attr('content'));
    console.log('StartDate (selector .evo_eventcard_time_t):', $('.evo_eventcard_time_t').text());

    console.log('HTML snippet around startDate:', $('.evo_event_schema').html());
}

debugScrape();

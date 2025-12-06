
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function scrapeLavarla() {
    console.log('Fetching Lavarla Sitemap...');
    try {
        const res = await fetch('https://lavarla.com/ajde_events-sitemap.xml', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const xml = await res.text();
        const $map = cheerio.load(xml, { xmlMode: true });

        const urls: string[] = [];
        $map('loc').each((i: number, el: any) => {
            const u = $map(el).text();
            if (u !== 'https://lavarla.com/etkinlik/' && !u.includes('/page/')) urls.push(u);
        });

        console.log(`Found ${urls.length} URLs. First 3: ${urls.slice(0, 3).join(', ')}`);

        if (urls.length > 0) {
            const eventUrl = urls[0];
            console.log(`Scraping event: ${eventUrl}`);

            const eventRes = await fetch(eventUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const html = await eventRes.text();
            fs.writeFileSync('body_dump.html', html);
            console.log('Dumped HTML to body_dump.html');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

scrapeLavarla();

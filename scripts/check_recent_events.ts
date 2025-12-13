import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from correct path
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config(); // Fallback
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
    try {
        console.log('Checking database...');

        // Count events by source in the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data, error } = await sb
            .from('events')
            .select('source_url, created_at')
            .gte('created_at', yesterday.toISOString());

        if (error) throw error;

        const counts = {
            biletinial: 0,
            passo: 0,
            biletix: 0,
            total: data.length
        };

        data.forEach(e => {
            if (e.source_url?.includes('biletinial')) counts.biletinial++;
            else if (e.source_url?.includes('passo')) counts.passo++;
            else if (e.source_url?.includes('biletix')) counts.biletix++;
        });

        console.log('=== Events Scraped in Last 24h ===');
        console.log('Biletinial:', counts.biletinial);
        console.log('Passo:', counts.passo);
        console.log('Biletix:', counts.biletix);
        console.log('Total:', counts.total);

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkDB();

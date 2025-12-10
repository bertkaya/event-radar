import { createClient, SupabaseClient } from '@supabase/supabase-js';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as dotenv from 'dotenv';
import { Event } from './types';

// Load env vars from .env.local if not already loaded
dotenv.config({ path: '.env.local' });

// --- Database Helper ---
let supabase: SupabaseClient | null = null;

export function getSupabase() {
    if (supabase) return supabase;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
        supabase = createClient(url, key);
    } else {
        console.warn('Supabase credentials missing. Running in simulation mode (no separate DB connection).');
    }
    return supabase;
}

export async function saveEvents(events: Event[], sourceName: string) {
    const sb = getSupabase();
    if (!sb) {
        console.log(`[${sourceName}] Simulation: Would save ${events.length} events.`);
        return;
    }

    console.log(`[${sourceName}] Saving ${events.length} events to Supabase...`);

    // Upsert one by one or batch - batch is better but let's do safe chunking
    // On conflict on 'source_url'
    for (const event of events) {
        const { error } = await sb
            .from('events')
            .upsert(event, { onConflict: 'source_url' });

        if (error) {
            console.error(`[${sourceName}] Error saving ${event.title}:`, error.message);
        }
    }
    console.log(`[${sourceName}] Save complete.`);
}


// --- Puppeteer Helper ---
let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
    if (browserInstance) return browserInstance;

    browserInstance = await puppeteer.launch({
        headless: false, // Set to false to see the browser for debugging and bypass simple bot detection
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        defaultViewport: { width: 1280, height: 800 }
    });
    return browserInstance;
}

export async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}

// --- Date Helper ---

// Fix Date Format: 2025-9-23T11:00+3:00 -> 2025-09-23T11:00:00+03:00
export const normalizeDate = (d: string | undefined): string | null => {
    if (!d) return null;
    // Fix timezone +3:00 -> +03:00
    let fixed = d.replace(/\+(\d):/, '+0$1:');

    // Fix single digit month/day: 2025-9-5T -> 2025-09-05T
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

    // Ensure ISO string validity
    try {
        const date = new Date(fixed);
        return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
        return null;
    }
};

// Sleep helper
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

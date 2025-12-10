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

// --- Popup Handling ---
export async function dismissPopups(page: Page) {
    // Generic selectors for Cookies, Newsletters, etc.
    const selectors = [
        '#onetrust-accept-btn-handler', // Common OneTrust
        '.cc-btn.cc-dismiss',           // Common CookieConsent
        'button[class*="cookie"][class*="accept"]',
        'button[class*="close"]',
        '[aria-label="Close"]',
        '[aria-label="Kapat"]',
        '.modal-close',
        '.popup-close',
        // Specific text buttons often used in TR
        'xpath///button[contains(text(), "Kabul Et")]',
        'xpath///button[contains(text(), "Tamam")]',
        'xpath///button[contains(text(), "Anladım")]'
    ];

    for (const sel of selectors) {
        try {
            if (sel.startsWith('xpath/')) {
                const xpath = sel.replace('xpath/', '');
                const elements = await page.$$(`xpath/${xpath}`);
                if (elements.length > 0) {
                    await (elements[0] as any).click();
                    console.log('Dismissed popup (XPath):', xpath);
                    await sleep(500); // Wait for animation
                }
            } else {
                const el = await page.$(sel);
                if (el && await el.isVisible()) {
                    await el.click();
                    console.log('Dismissed popup (Selector):', sel);
                    await sleep(500);
                }
            }
        } catch (e) {
            // Ignore errors, just trying to click
        }
    }
}

export function parsePrice(priceStr: string | undefined): number | null {
    if (!priceStr) return null;
    // Remove non-numeric chars except comma/dot
    // Common formats: "500 TL", "500.00 TL", "1.250 TL"

    // 1. Remove currency symbol and whitespace
    let clean = priceStr.replace('TL', '').replace('₺', '').trim();

    // 2. Handle 1.000 format (Turkish thousands separator is dot)
    // If there is a comma, it's likely a decimal separator in TR locale "10,50" -> 10.50
    // "1.250" -> 1250

    // Simple heuristic: Remove dots (thousands), replace comma with dot (decimal)
    clean = clean.replace(/\./g, '').replace(',', '.');

    const val = parseFloat(clean);
    return isNaN(val) ? null : Math.round(val);
}

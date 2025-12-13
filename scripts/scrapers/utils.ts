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

    console.log(`[${sourceName}] Saving ${events.length} events to Supabase (batch mode)...`);

    // Batch upsert in chunks of 50 for better performance
    const BATCH_SIZE = 50;
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const { error } = await sb
            .from('events')
            .upsert(batch, { onConflict: 'source_url' });

        if (error) {
            console.error(`[${sourceName}] Batch error at ${i}-${i + BATCH_SIZE}:`, error.message);
        }
    }
    console.log(`[${sourceName}] Save complete.`);
}


// --- Puppeteer Helper ---
let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
    if (browserInstance) return browserInstance;

    browserInstance = await puppeteer.launch({
        headless: process.env.HEADLESS === 'true' ? true : false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-images',
            '--blink-settings=imagesEnabled=false',
            '--disable-extensions',
            '--disable-background-networking',
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
    // Comprehensive popup/cookie selectors for Turkish ticket sites
    const selectors = [
        // OneTrust (very common)
        '#onetrust-accept-btn-handler',
        '#onetrust-pc-btn-handler',
        '.onetrust-close-btn-handler',
        // Generic cookie consent
        '.cc-btn.cc-dismiss',
        '.cc-allow',
        'button[class*="cookie"][class*="accept"]',
        'button[class*="cookie"][class*="kabul"]',
        '[class*="cookie-accept"]',
        '[class*="cookieAccept"]',
        // Close buttons
        'button[class*="close"]',
        '[aria-label="Close"]',
        '[aria-label="Kapat"]',
        '.modal-close',
        '.popup-close',
        '.close-btn',
        '.btn-close',
        // Biletix specific
        '.bx-popup-close',
        '.bx-modal-close',
        '[class*="dismiss"]',
        // Passo specific
        '.passo-popup-close',
        '.modal-backdrop + .modal .close',
        // Newsletter/notification popups
        '[class*="newsletter"] button[class*="close"]',
        '[class*="notification"] button[class*="close"]',
        // Generic Turkish text buttons
        'button:has-text("Kabul Et")',
        'button:has-text("Kabul Ediyorum")',
        'button:has-text("Tamam")',
        'button:has-text("Anladım")',
        'button:has-text("Kapat")',
        'button:has-text("Devam")',
        'button:has-text("Onayla")',
        // GDPR/KVKK
        '[class*="gdpr"] button',
        '[class*="kvkk"] button[class*="accept"]'
    ];

    // Run multiple passes as some popups appear after others close
    for (let pass = 0; pass < 3; pass++) {
        for (const sel of selectors) {
            try {
                // Handle :has-text pseudo selector
                if (sel.includes(':has-text')) {
                    const textMatch = sel.match(/:has-text\("(.+)"\)/);
                    if (textMatch) {
                        const text = textMatch[1];
                        const buttons = await page.$$('button');
                        for (const btn of buttons) {
                            const btnText = await btn.evaluate(el => el.textContent?.trim());
                            if (btnText && btnText.includes(text)) {
                                await btn.click().catch(() => { });
                                await sleep(300);
                            }
                        }
                    }
                } else {
                    const el = await page.$(sel);
                    if (el) {
                        const isVisible = await el.isVisible().catch(() => false);
                        if (isVisible) {
                            await el.click().catch(() => { });
                            console.log(`[Popup] Dismissed: ${sel}`);
                            await sleep(300);
                        }
                    }
                }
            } catch (e) {
                // Ignore - popup not present
            }
        }
        await sleep(500);
    }
}

// Wait for navigation and dismiss popups
export async function safeNavigate(page: Page, url: string, timeout = 60000) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout });
    await sleep(2000); // Wait for JS to load
    await dismissPopups(page);
    await sleep(500);
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

export async function autoScroll(page: Page) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 15000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

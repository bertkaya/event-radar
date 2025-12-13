import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Helper for ESM environments if needed, but we use standard processing
// Load env vars
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    console.log('Loading .env.local');
    dotenv.config({ path: envLocalPath });
} else {
    console.log('Loading .env');
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function exportToExcel() {
    try {
        console.log('Fetching events from database...');

        // Fetch all future events or events created recently
        const { data: events, error } = await sb
            .from('events')
            .select('*')
            .order('start_time', { ascending: true });

        if (error) throw error;
        if (!events || events.length === 0) {
            console.log('No events found in database.');
            return;
        }

        console.log(`Found ${events.length} events. Generating Excel...`);

        // Prepare data for Excel
        const excelData = events.map(e => {
            let fiyat = '';
            if (e.ticket_details) {
                try {
                    const tickets = typeof e.ticket_details === 'string'
                        ? JSON.parse(e.ticket_details)
                        : e.ticket_details;

                    if (Array.isArray(tickets)) {
                        fiyat = tickets.map((t: any) => `${t.name}: ${t.price}`).join(' | ');
                    }
                } catch (err) {
                    console.log('Error parsing tickets:', err);
                }
            }

            return {
                ID: e.id,
                Etkinlik: e.title,
                Kategori: e.category || 'Genel',
                Tarih: e.start_time ? new Date(e.start_time).toLocaleString('tr-TR') : '',
                Mekan: e.venue_name,
                Sehir: e.city || '',
                Fiyat: fiyat,
                Link: e.source_url,
                Gorsel: e.image_url,
                Aciklama: (e.description || '').substring(0, 32000) // Excel cell limit
            };
        });

        // Create Workbook
        const wb = XLSX.utils.book_new();

        // 1. All Events Sheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Tüm Etkinlikler");

        // 2. Separate Sheets by Source
        const sources = ['biletinial', 'passo', 'biletix'];
        sources.forEach(source => {
            const sourceEvents = excelData.filter(e => e.Link && e.Link.includes(source));
            if (sourceEvents.length > 0) {
                const wsSource = XLSX.utils.json_to_sheet(sourceEvents);
                XLSX.utils.book_append_sheet(wb, wsSource, source.charAt(0).toUpperCase() + source.slice(1));
            }
        });

        // Ensure exports directory exists
        const exportDir = path.resolve(process.cwd(), 'exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        const fileName = `events_export_${new Date().getTime()}.xlsx`;
        const filePath = path.join(exportDir, fileName);

        XLSX.writeFile(wb, filePath);
        console.log(`✅ Excel export created: ${filePath}`);

    } catch (e) {
        console.error('Export failed:', e);
    }
}

exportToExcel();

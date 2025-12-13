
import { BiletinialScraper } from './scrapers/biletinial.js';
import { PassoScraper } from './scrapers/passo.js';
import { BiletixScraper } from './scrapers/biletix.js';
import { Event } from './scrapers/types.js';
import { closeBrowser } from './scrapers/utils.js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Convert events to Excel format matching the Toplu Yükleme template
function eventsToExcelData(events: Event[]) {
    return events.map(event => ({
        Baslik: event.title,
        Mekan: event.venue_name,
        Adres: event.address || '',
        Kategori: event.category || 'Etkinlik',
        Fiyat: event.ticket_details && event.ticket_details.length > 0
            ? event.ticket_details.map(t => `${t.name}: ${t.price}`).join(' | ')
            : '',
        Baslangic: event.start_time ? new Date(event.start_time).toLocaleString('tr-TR') : '',
        Bitis: event.end_time ? new Date(event.end_time).toLocaleString('tr-TR') : '',
        Enlem: event.lat || '',
        Boylam: event.lng || '',
        Aciklama: event.description?.replace(/<[^>]*>/g, '').slice(0, 500) || '', // Strip HTML
        Resim: event.image_url || '',
        Bilet: event.source_url || '',
        Kurallar: event.rules ? event.rules.join(' | ') : ''
    }));
}

async function scrapeToExcel() {
    console.log('='.repeat(60));
    console.log('📊 SCRAPER TO EXCEL - Etkinlik Listesi Oluşturucu');
    console.log('='.repeat(60));

    const allEvents: Event[] = [];
    const timestamp = new Date().toISOString().slice(0, 10);
    const outputDir = path.join(process.cwd(), 'exports');

    // Create exports directory if not exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Run scrapers
    const scrapers = [
        { instance: BiletinialScraper, name: 'Biletinial' },
        { instance: PassoScraper, name: 'Passo' },
        { instance: BiletixScraper, name: 'Biletix' }
    ];

    for (const scraper of scrapers) {
        console.log(`\n--- Running ${scraper.name} ---`);
        try {
            const events = await scraper.instance.scrape();
            console.log(`[${scraper.name}] Found ${events.length} events`);

            // Save individual Excel per source
            if (events.length > 0) {
                const data = eventsToExcelData(events);
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Etkinlikler');

                const filename = `${scraper.name}_${timestamp}.xlsx`;
                const filepath = path.join(outputDir, filename);
                XLSX.writeFile(wb, filepath);
                console.log(`✅ Saved: ${filepath}`);
            }

            allEvents.push(...events);
        } catch (e) {
            console.error(`[${scraper.name}] Error:`, e);
        }
    }

    // Save combined Excel
    if (allEvents.length > 0) {
        const data = eventsToExcelData(allEvents);
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tüm Etkinlikler');

        const filename = `Tum_Etkinlikler_${timestamp}.xlsx`;
        const filepath = path.join(outputDir, filename);
        XLSX.writeFile(wb, filepath);
        console.log(`\n📦 Combined: ${filepath}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ TAMAMLANDI: ${allEvents.length} etkinlik Excel'e aktarıldı`);
    console.log(`📂 Dosyalar: ${outputDir}`);
    console.log('='.repeat(60));

    await closeBrowser();
    process.exit(0);
}

scrapeToExcel();

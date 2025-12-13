
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportEventsToExcel() {
    console.log('='.repeat(60));
    console.log('📊 DATABASE TO EXCEL - Etkinlik Listesi İndirici');
    console.log('='.repeat(60));

    const timestamp = new Date().toISOString().slice(0, 10);
    const outputDir = path.join(process.cwd(), 'exports');

    // Create exports directory if not exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Fetch all events from database
    console.log('\n📥 Fetching events from database...');
    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

    if (error) {
        console.error('❌ Database error:', error.message);
        process.exit(1);
    }

    if (!events || events.length === 0) {
        console.log('⚠️ No events found in database');
        process.exit(0);
    }

    console.log(`✅ Found ${events.length} events`);

    // Convert to Excel format
    const excelData = events.map(event => ({
        ID: event.id,
        Baslik: event.title,
        Mekan: event.venue_name,
        Adres: event.address || '',
        Kategori: event.category || '',
        Mood: event.ai_mood || '',
        Fiyat: event.price || '',
        Baslangic: event.start_time ? new Date(event.start_time).toLocaleString('tr-TR') : '',
        Bitis: event.end_time ? new Date(event.end_time).toLocaleString('tr-TR') : '',
        Enlem: event.lat || '',
        Boylam: event.lng || '',
        Aciklama: event.description?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
        Resim: event.image_url || '',
        Bilet: event.ticket_url || '',
        Kurallar: event.rules || '',
        Onaylı: event.is_approved ? 'Evet' : 'Hayır',
        Tükendi: event.sold_out ? 'Evet' : 'Hayır',
        Kaynak: event.source_url || 'Manuel'
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Etkinlikler');

    // Save file
    const filename = `DB_Etkinlikler_${timestamp}.xlsx`;
    const filepath = path.join(outputDir, filename);
    XLSX.writeFile(wb, filepath);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ TAMAMLANDI: ${events.length} etkinlik Excel'e aktarıldı`);
    console.log(`📂 Dosya: ${filepath}`);
    console.log('='.repeat(60));

    process.exit(0);
}

exportEventsToExcel();

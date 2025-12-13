import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkDB() {
    const { data, count, error } = await sb
        .from('events')
        .select('source_url, title, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const biletinial = data?.filter(e => e.source_url?.includes('biletinial')).length || 0;
    const passo = data?.filter(e => e.source_url?.includes('passo')).length || 0;
    const biletix = data?.filter(e => e.source_url?.includes('biletix')).length || 0;

    console.log('=== DATABASE STATUS ===');
    console.log('Total events in DB:', count);
    console.log('');
    console.log('Last 100 events by source:');
    console.log('  Biletinial:', biletinial);
    console.log('  Passo:', passo);
    console.log('  Biletix:', biletix);
    console.log('  Other:', 100 - biletinial - passo - biletix);
    console.log('');
    console.log('Last 5 events:');
    data?.slice(0, 5).forEach(e => {
        console.log(`  - ${e.title?.substring(0, 50)}... (${e.source_url?.split('/')[2] || 'manuel'})`);
    });

    process.exit(0);
}

checkDB();

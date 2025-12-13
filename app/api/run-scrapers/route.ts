
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request): Promise<Response> {
    try {
        const body = await request.json().catch(() => ({}));
        const scraperName = body.scraper || 'all';

        // Log start
        await supabase.from('scraper_logs').insert({
            scraper_name: scraperName,
            status: 'running',
            events_count: 0
        });

        // Since Vercel serverless functions can't spawn child processes reliably,
        // we'll return a message telling the user to run scrapers manually
        // or set up a scheduled function/GitHub Action

        return NextResponse.json({
            success: false,
            message: 'Scraperlar serverless ortamda çalıştırılamaz. Lütfen terminalde çalıştırın: npx tsx scripts/run_scrapers.ts',
            hint: 'GitHub Actions veya cron job kurulumu için .github/workflows/scrape_events.yml dosyasını kullanabilirsiniz.'
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

export async function GET() {
    // Return scraper status
    const { data: logs } = await supabase
        .from('scraper_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    return NextResponse.json({
        scrapers: ['biletinial', 'passo', 'biletix'],
        recentLogs: logs || []
    });
}

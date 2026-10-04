
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-session';

const unauthorized = () => NextResponse.json({ success: false, error: 'Yetkisiz' }, { status: 401 });

export async function POST(request: Request): Promise<Response> {
    if (!(await isAdminRequest())) return unauthorized();
    const supabase = getSupabaseAdmin();
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
            message: "Etkinlik alımı sunucuda değil, GitHub Actions'ta 3 saatte bir çalışır. Hemen çalıştırmak için GitHub → Actions → Etkinlik Alımı → Run workflow.",
            hint: 'Durum ve geçmiş için admin → Kaynaklar sekmesine bakın.'
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}

export async function GET() {
    if (!(await isAdminRequest())) return unauthorized();
    const supabase = getSupabaseAdmin();
    // Return scraper status
    const { data: logs } = await supabase
        .from('scraper_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    return NextResponse.json({
        scrapers: ['bugece', 'izmir-bb', 'kultur-istanbul'],
        recentLogs: logs || []
    });
}

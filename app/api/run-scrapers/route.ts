
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const scraperName = body.scraper || 'all'; // 'all', 'biletinial', 'passo', 'biletix'

        // Log start
        await supabase.from('scraper_logs').insert({
            scraper_name: scraperName,
            status: 'running',
            events_count: 0
        });

        // Run the scraper script using npx tsx
        const scriptPath = path.join(process.cwd(), 'scripts', 'run_scrapers.ts');

        return new Promise((resolve) => {
            const child = spawn('npx', ['tsx', scriptPath], {
                cwd: process.cwd(),
                shell: true,
                env: { ...process.env }
            });

            let output = '';
            let errorOutput = '';

            child.stdout?.on('data', (data) => {
                output += data.toString();
            });

            child.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('close', async (code) => {
                const success = code === 0;

                // Update log
                await supabase.from('scraper_logs').insert({
                    scraper_name: scraperName,
                    status: success ? 'success' : 'failed',
                    events_count: 0,
                    error_message: success ? null : errorOutput.slice(0, 500)
                });

                resolve(NextResponse.json({
                    success,
                    message: success ? 'Scrapers completed' : 'Scrapers failed',
                    output: output.slice(-1000),
                    error: errorOutput.slice(0, 500)
                }));
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                child.kill();
                resolve(NextResponse.json({
                    success: false,
                    message: 'Scraper timed out after 5 minutes'
                }));
            }, 5 * 60 * 1000);
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

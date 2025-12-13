import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
    try {
        const { url } = await request.json();

        if (!url || !url.includes('biletinial.com')) {
            return NextResponse.json({ success: false, error: 'Geçersiz URL. Sadece Biletinial linkleri destekleniyor.' }, { status: 400 });
        }

        // Fetch the page HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ success: false, error: 'Sayfa yüklenemedi.' }, { status: 400 });
        }

        const html = await response.text();

        // Extract og:image
        const ogImageMatch = html.match(/<meta[^>]*property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i);
        const imageUrl = ogImageMatch ? ogImageMatch[1] : '';

        // Extract og:title
        const ogTitleMatch = html.match(/<meta[^>]*property=['"]og:title['"][^>]*content=['"]([^'"]+)['"]/i);
        let title = ogTitleMatch ? ogTitleMatch[1] : '';
        // Clean title - remove "Biletleri | biletinial" suffix
        title = title.replace(/\s*Biletleri\s*\|\s*biletinial/gi, '').replace(/\s*Tiyatro Oyunu/gi, '').trim();

        // Extract og:description
        const ogDescMatch = html.match(/<meta[^>]*property=['"]og:description['"][^>]*content=['"]([^'"]+)['"]/i);
        const shortDescription = ogDescMatch ? ogDescMatch[1] : '';

        // Extract category from URL path
        const urlPath = new URL(url).pathname;
        let category = 'Diğer';
        if (urlPath.includes('/tiyatro/')) category = 'Tiyatro';
        else if (urlPath.includes('/muzik/') || urlPath.includes('/konser/')) category = 'Müzik';
        else if (urlPath.includes('/stand-up/')) category = 'Stand-Up';
        else if (urlPath.includes('/spor/') || urlPath.includes('/futbol/')) category = 'Spor';
        else if (urlPath.includes('/kids/') || urlPath.includes('/cocuk/')) category = 'Aile';
        else if (urlPath.includes('/opera-bale/')) category = 'Sanat';
        else if (urlPath.includes('/egitim/') || urlPath.includes('/seminer/')) category = 'Eğitim';
        else if (urlPath.includes('/festival/') || urlPath.includes('/etkinlik/')) category = 'Festival';
        else if (urlPath.includes('/eglence/') || urlPath.includes('/parti/')) category = 'Parti';

        // Extract duration - look for "Süre" text followed by duration
        const durationMatch = html.match(/Süre[^<]*<[^>]*>([^<]*dakika)/i);
        const duration = durationMatch ? durationMatch[1].trim() : '';

        // Extract rules - look for etkinlik kuralları section
        let rules: string[] = [];
        const rulesSection = html.match(/Etkinlik Kuralları[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
        if (rulesSection) {
            const liMatches = rulesSection[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
            for (const match of liMatches) {
                const cleanRule = match[1].replace(/<[^>]+>/g, '').trim();
                if (cleanRule.length > 10) {
                    rules.push(cleanRule);
                }
            }
        }

        // Extract venue names from page
        const venueMatches = html.matchAll(/href="[^"]*\/mekan\/[^"]*"[^>]*>([^<]+)</gi);
        const venues: string[] = [];
        for (const match of venueMatches) {
            const venueName = match[1].trim();
            if (venueName && !venues.includes(venueName) && venueName.length > 3) {
                venues.push(venueName);
            }
        }

        // Try to extract more detailed description
        let description = shortDescription;
        // Look for main description section
        const descMatch = html.match(/Yaş sınırı:[^.]*\.\s*([\s\S]{100,800}?)(?:<\/p>|<br|<div)/i);
        if (descMatch) {
            description = descMatch[1].replace(/<[^>]+>/g, '').trim();
        }

        return NextResponse.json({
            success: true,
            data: {
                title,
                description,
                category,
                image_url: imageUrl,
                ticket_url: url,
                duration,
                rules: rules.slice(0, 5), // Limit to 5 rules
                venues: venues.slice(0, 10), // Limit to 10 venues
            }
        });

    } catch (error: any) {
        console.error('Scrape link error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Bir hata oluştu.'
        }, { status: 500 });
    }
}

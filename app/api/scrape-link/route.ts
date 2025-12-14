import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
    try {
        const { url } = await request.json();

        // Support both biletinial and bubilet
        const isBiletinial = url && url.includes('biletinial.com');
        const isBubilet = url && url.includes('bubilet.com.tr');

        if (!url || (!isBiletinial && !isBubilet)) {
            return NextResponse.json({ success: false, error: 'Geçersiz URL. Biletinial veya Bubilet linkleri destekleniyor.' }, { status: 400 });
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

        // Route to appropriate scraper
        if (isBubilet) {
            return scrapeBubilet(html, url);
        } else {
            return scrapeBiletinial(html, url);
        }

    } catch (error: any) {
        console.error('Scrape link error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Bir hata oluştu.'
        }, { status: 500 });
    }
}

// Bubilet scraper
function scrapeBubilet(html: string, url: string): Response {
    // Extract og:image
    const ogImageMatch = html.match(/<meta[^>]*property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i);
    const imageUrl = ogImageMatch ? ogImageMatch[1] : '';

    // Extract og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=['"]og:title['"][^>]*content=['"]([^'"]+)['"]/i);
    let title = ogTitleMatch ? ogTitleMatch[1] : '';
    // Clean title - remove "| Bubilet" suffix
    title = title.replace(/\s*\|\s*Bubilet/gi, '').replace(/\s*biletleri/gi, '').trim();

    // Extract og:description
    const ogDescMatch = html.match(/<meta[^>]*property=['"]og:description['"][^>]*content=['"]([^'"]+)['"]/i);
    const description = ogDescMatch ? ogDescMatch[1] : '';

    // Detect category from URL or title
    const urlPath = new URL(url).pathname;
    let category = 'Müzik';
    if (urlPath.includes('/tiyatro') || title.toLowerCase().includes('tiyatro') || title.toLowerCase().includes('oyun')) category = 'Tiyatro';
    else if (title.toLowerCase().includes('stand-up') || title.toLowerCase().includes('güldür')) category = 'Stand-Up';
    else if (title.toLowerCase().includes('bale') || title.toLowerCase().includes('opera') || title.toLowerCase().includes('dans')) category = 'Sanat';
    else if (title.toLowerCase().includes('festival')) category = 'Festival';
    else if (title.toLowerCase().includes('parti') || title.toLowerCase().includes('dj')) category = 'Parti';
    else if (title.toLowerCase().includes('çocuk')) category = 'Aile';

    // Extract venue from /mekan/ links
    const venueMatches = html.matchAll(/href="[^"]*\/mekan\/[^"]*"[^>]*>([^<]+)</gi);
    const venues: string[] = [];
    for (const match of venueMatches) {
        const venueName = match[1].trim();
        if (venueName && !venues.includes(venueName) && venueName.length > 3) {
            venues.push(venueName);
        }
    }

    // Extract sessions from /seans/ links with dates
    interface Session {
        city: string;
        date: string;
        time: string;
        venue: string;
        price?: string;
    }
    const sessions: Session[] = [];

    // Turkish months
    const turkishMonths: { [key: string]: string } = {
        'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04',
        'Mayıs': '05', 'Haziran': '06', 'Temmuz': '07', 'Ağustos': '08',
        'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12'
    };

    // Find sessions - look for date patterns  
    const datePattern = /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?:\s+\w+)?(?:\s+-\s+(\d{2}:\d{2}))?/gi;

    let dateMatch;
    const datePositions: { date: string; time: string; position: number }[] = [];
    while ((dateMatch = datePattern.exec(html)) !== null) {
        const day = dateMatch[1].padStart(2, '0');
        const month = turkishMonths[dateMatch[2]] || '01';
        const year = new Date().getFullYear().toString();
        const time = dateMatch[3] || '20:00';
        datePositions.push({
            date: `${day}.${month}.${year}`,
            time,
            position: dateMatch.index
        });
    }

    // Extract city from URL
    const cityMatch = urlPath.match(/^\/(ankara|istanbul|izmir|antalya|bursa)/i);
    const city = cityMatch ? cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1) : '';

    // Find prices
    const priceMatches = html.matchAll(/(\d+(?:[.,]\d+)?)\s*₺/g);
    const prices: string[] = [];
    for (const match of priceMatches) {
        const price = match[1] + ' TL';
        if (!prices.includes(price)) {
            prices.push(price);
        }
    }

    // Build sessions combining dates with venue and prices
    for (let i = 0; i < datePositions.length; i++) {
        const dateInfo = datePositions[i];
        sessions.push({
            city: city || 'Belirtilmemiş',
            date: dateInfo.date,
            time: dateInfo.time,
            venue: venues[0] || '',
            price: prices[i] || prices[0] || ''
        });
    }

    // Extract rules if available
    const rules: string[] = [];
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

    return NextResponse.json({
        success: true,
        data: {
            title,
            description,
            category,
            image_url: imageUrl,
            ticket_url: url,
            duration: '',
            rules: rules.slice(0, 5),
            venues: venues.slice(0, 10),
            sessions: sessions.slice(0, 30),
        }
    });
}

// Biletinial scraper (existing logic)
function scrapeBiletinial(html: string, url: string): Response {
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

    // Extract sessions with city, date, time, and venue
    interface Session {
        city: string;
        date: string;
        time: string;
        venue: string;
        dateRaw?: string;
    }
    const sessions: Session[] = [];

    // Turkish months for parsing
    const turkishMonths: { [key: string]: string } = {
        'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04',
        'Mayıs': '05', 'Haziran': '06', 'Temmuz': '07', 'Ağustos': '08',
        'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12'
    };

    // Find session date patterns: "DD Ay DayName, HH:MM" or "DD Ay DayName YYYY, HH:MM"
    const datePattern = /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\w+(?:\s+(\d{4}))?,?\s*(\d{2}:\d{2})/gi;

    // Extract all date occurrences with their positions
    let dateMatch;
    const datePositions: { date: string; time: string; position: number; year: string }[] = [];
    while ((dateMatch = datePattern.exec(html)) !== null) {
        const day = dateMatch[1].padStart(2, '0');
        const month = turkishMonths[dateMatch[2]] || '01';
        const year = dateMatch[3] || new Date().getFullYear().toString();
        const time = dateMatch[4];
        datePositions.push({
            date: `${day}.${month}.${year}`,
            time,
            position: dateMatch.index,
            year
        });
    }

    // For each date found, try to find the nearest venue link before or after it
    for (const dateInfo of datePositions) {
        // Search for venue link near this date (within ~500 chars)
        const searchStart = Math.max(0, dateInfo.position - 500);
        const searchEnd = Math.min(html.length, dateInfo.position + 500);
        const nearbyHtml = html.substring(searchStart, searchEnd);

        // Find venue in nearby HTML
        const venueMatch = nearbyHtml.match(/href="[^"]*\/mekan\/([^"]+)"[^>]*>([^<]+)</i);
        let venue = venueMatch ? venueMatch[2].trim() : '';

        // Try to determine city from context or venue name
        let city = '';
        const cityPatterns = ['Ankara', 'İstanbul Anadolu', 'İstanbul Avrupa', 'İstanbul', 'Bursa', 'Eskişehir', 'İzmir', 'Antalya', 'Yalova', 'Kocaeli', 'Gaziantep'];
        for (const cityName of cityPatterns) {
            if (nearbyHtml.includes(cityName)) {
                city = cityName;
                break;
            }
        }

        if (venue && dateInfo.date) {
            // Avoid duplicates
            const exists = sessions.some(s => s.date === dateInfo.date && s.time === dateInfo.time && s.venue === venue);
            if (!exists) {
                sessions.push({
                    city: city || 'Belirtilmemiş',
                    date: dateInfo.date,
                    time: dateInfo.time,
                    venue: venue
                });
            }
        }
    }

    // Sort sessions by date
    sessions.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('.');
        const [dayB, monthB, yearB] = b.date.split('.');
        const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
        const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
        return dateA.getTime() - dateB.getTime();
    });

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
            sessions: sessions.slice(0, 30), // Limit to 30 sessions
        }
    });
}


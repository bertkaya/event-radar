import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const sb = createClient(supabaseUrl, supabaseKey);

async function seedDemoEvents() {
    console.log('Seeding curated demo events...');

    const now = new Date();
    
    // Create dates for today, tomorrow, and this weekend
    const today = new Date(now);
    today.setHours(20, 30, 0, 0);

    const todayNight = new Date(now);
    todayNight.setHours(22, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 30, 0, 0);

    const thisFriday = new Date(now);
    thisFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7));
    thisFriday.setHours(21, 0, 0, 0);

    const thisSaturday = new Date(now);
    thisSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    thisSaturday.setHours(20, 0, 0, 0);

    const thisSunday = new Date(now);
    thisSunday.setDate(thisSaturday.getDate() + 1);
    thisSunday.setHours(18, 30, 0, 0);

    const demoEvents = [
        // --- İSTANBUL ---
        {
            title: "Büyük Ev Ablukada: Akustik Elektrik",
            venue_name: "Zorlu PSM - Turkcell Sahnesi",
            address: "Levazım, Koru Sokağı No:2, Beşiktaş/İstanbul",
            category: "Müzik",
            price: "450 TL",
            min_price: 450,
            start_time: today.toISOString(),
            end_time: new Date(today.getTime() + 3 * 3600 * 1000).toISOString(),
            lat: 41.0664,
            lng: 29.0175,
            image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://www.passo.com.tr",
            is_approved: true,
            is_featured: true,
            feature_priority: 10,
            ai_mood: "Kopmalık 🎸",
            summary: "Büyük Ev Ablukada'nın enerjik sahne performansı ve yenilenmiş akustik repertuvarı.",
            description: "Zorlu PSM'de unutulmaz bir akşam! Büyük Ev Ablukada, sevilen şarkılarını özel bir görsel şov eşliğinde sahneye taşıyor.",
            rules: "18 yaş sınırı vardır.\nEtkinlik başlangıcından sonra salona seyirci alınmayacaktır.\nProfesyonel ses ve görüntü kaydı yasaktır."
        },
        {
            title: "Karanlıkta Mum Işığında Jazz: Chet Baker Tribute",
            venue_name: "The Badau Akasya",
            address: "Acıbadem, Çeçen Sk., Üsküdar/İstanbul",
            category: "Müzik",
            price: "350 TL",
            min_price: 350,
            start_time: todayNight.toISOString(),
            end_time: new Date(todayNight.getTime() + 2.5 * 3600 * 1000).toISOString(),
            lat: 41.0028,
            lng: 29.0558,
            image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://www.biletix.com",
            is_approved: true,
            is_featured: false,
            ai_mood: "Date Night 🍷",
            summary: "Şarap eşliğinde samimi bir caz gecesi ve nostaljik Chet Baker melodileri.",
            description: "Akşamın yorgunluğunu kaliteli caz ezgileri ve enfes atıştırmalıklar eşliğinde atın.",
            rules: "Etkinlik bistro ve masa düzenindedir.\nMekan içi fısıltı kuralı geçerlidir."
        },
        {
            title: "Doğu Demirkol Tek Kişilik Stand-Up Gösterisi",
            venue_name: "Bostancı Gösteri Merkezi",
            address: "Bostancı, Mehmet Şevki Paşa Cd., Kadıköy/İstanbul",
            category: "Stand-Up",
            price: "280 TL",
            min_price: 280,
            start_time: tomorrow.toISOString(),
            end_time: new Date(tomorrow.getTime() + 2 * 3600 * 1000).toISOString(),
            lat: 40.9575,
            lng: 29.0964,
            image_url: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://www.biletinial.com",
            is_approved: true,
            is_featured: false,
            ai_mood: "Kopmalık 🎸",
            summary: "Kahkaha dolu 2 saat; Doğu Demirkol'un güncel hayat gözlemleri.",
            description: "Türkiye'nin en sevilen komedyenlerinden Doğu Demirkol yeni sezon şovuyla sahnede.",
            rules: "16 yaş sınırı bulunmaktadır.\nKamera çekimi yasaktır."
        },
        {
            title: "Gece Müzesi: Dijital Sanat & Işık Enstalasyonları",
            venue_name: "İstanbul Modern",
            address: "Kılıçali Paşa Mah. Tophane İskele Cad. Beyoğlu/İstanbul",
            category: "Sanat",
            price: "Ücretsiz",
            min_price: 0,
            start_time: thisFriday.toISOString(),
            end_time: new Date(thisFriday.getTime() + 4 * 3600 * 1000).toISOString(),
            lat: 41.0258,
            lng: 28.9835,
            image_url: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://www.istanbulmodern.org",
            is_approved: true,
            is_featured: true,
            feature_priority: 8,
            ai_mood: "Chill & Sanat 🎨",
            summary: "Boğaz manzarası eşliğinde gece boyu açık ücretsiz çağdaş sanat sergisi.",
            description: "Cuma geceleri müze 23:00'e kadar açık! Dijital enstalasyonlar, rehberli turlar ve canlı ambient DJ performansı.",
            rules: "Giriş serbesttir, kayıt gerekmez."
        },

        // --- ANKARA ---
        {
            title: "Manga Senfonik Özel Konseri",
            venue_name: "CSO Ada Ankara - Ana Salon",
            address: "Talatpaşa Bulvarı No:38, Altındağ/Ankara",
            category: "Müzik",
            price: "320 TL",
            min_price: 320,
            start_time: today.toISOString(),
            end_time: new Date(today.getTime() + 2.5 * 3600 * 1000).toISOString(),
            lat: 39.9333,
            lng: 32.8528,
            image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://www.biletinial.com",
            is_approved: true,
            is_featured: true,
            feature_priority: 9,
            ai_mood: "Kopmalık 🎸",
            summary: "Senfoni orkestrası eşliğinde efsane Manga şarkılarıyla coşkulu bir akşam.",
            description: "CSO Ada Ankara'nın büyüleyici akustiğinde Manga hitleri ilk kez 50 kişilik dev senfoni orkestrasıyla buluşuyor.",
            rules: "Konser başladıktan sonra alkış aralarında dahi kapılar açılmayacaktır."
        },
        {
            title: "Tunalı Şarap & Seramik Atölyesi (Wine & Clay)",
            venue_name: "Kolektif Sanat Atölyesi - Tunalı",
            address: "Tunalı Hilmi Cd. No:84, Çankaya/Ankara",
            category: "Workshop",
            price: "400 TL",
            min_price: 400,
            start_time: tomorrow.toISOString(),
            end_time: new Date(tomorrow.getTime() + 2 * 3600 * 1000).toISOString(),
            lat: 39.9032,
            lng: 32.8644,
            image_url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://www.bubilet.com.tr",
            is_approved: true,
            is_featured: false,
            ai_mood: "Kendini Geliştir 🧠",
            summary: "Kendi bardağını tasarla, şarabını yudumla; mesai sonrası mükemmel terapi.",
            description: "Deneyim gerektirmez! Eğitmen eşliğinde kille şekil verip fırınlanmaya hazır ürününüzü yaparken hoş sohbet ve içecek ikramı.",
            rules: "Tüm malzemeler ve 1 kadeh içecek fiyata dahildir."
        },
        {
            title: "Açık Hava Sineması: La La Land & Kokteyl",
            venue_name: "CerModern",
            address: "Altınsoy Cad. No:3, Sıhhiye/Ankara",
            category: "Sinema",
            price: "180 TL",
            min_price: 180,
            start_time: thisSaturday.toISOString(),
            end_time: new Date(thisSaturday.getTime() + 2.5 * 3600 * 1000).toISOString(),
            lat: 39.9298,
            lng: 32.8465,
            image_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://www.cermodern.org",
            is_approved: true,
            is_featured: false,
            ai_mood: "Date Night 🍷",
            summary: "Yıldızların altında nostaljik açık hava sineması ve sıcak içecekler.",
            description: "CerModern avlusunda şezlong ve minderlerde film keyfi. Battaniye mekan tarafından temin edilir.",
            rules: "Dışarıdan yiyecek/içecek getirilmesi uygun değildir."
        },

        // --- İZMİR ---
        {
            title: "Sunset Jazz & Craft Beer Gecesi",
            venue_name: "Alsancak Tarihi Havagazı Fabrikası",
            address: "Liman Cd., Alsancak, Konak/İzmir",
            category: "Festival",
            price: "Ücretsiz",
            min_price: 0,
            start_time: thisSunday.toISOString(),
            end_time: new Date(thisSunday.getTime() + 4 * 3600 * 1000).toISOString(),
            lat: 38.4382,
            lng: 27.1472,
            image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80",
            ticket_url: "https://kulturturizm.izmir.bel.tr",
            is_approved: true,
            is_featured: true,
            feature_priority: 7,
            ai_mood: "Chill & Sanat 🎨",
            summary: "Körfez esintisi eşliğinde gün batımı caz dinletisi ve lezzet stantları.",
            description: "İzmir Büyükşehir Belediyesi katkılarıyla Tarihi Havagazı çimlerinde açık hava caz buluşması.",
            rules: "Giriş ücretsizdir. Katlanır sandalye ve minder serbesttir."
        }
    ];

    for (const ev of demoEvents) {
        const { error } = await sb.from('events').upsert(ev, { onConflict: 'title' });
        if (error) {
            console.error(`Error inserting ${ev.title}:`, error.message);
        } else {
            console.log(`✅ Demo Event Loaded: ${ev.title} (${ev.ai_mood})`);
        }
    }

    console.log('Seeding finished successfully!');
    process.exit(0);
}

seedDemoEvents();

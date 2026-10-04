// lib/sources/catalog.ts
// İncelenen bütün etkinlik kaynakları: erişim yöntemi, karar ve gerekçe.
// Hem toplayıcı (scripts/ingest) hem admin paneli bu kataloğu kullanır.
// Bir kaynağı "integrated" yapmadan önce erişim izni ve koşulları yeniden doğrulayın.

export type SourceType = 'ticketing' | 'editorial' | 'official'

export type AccessMethod =
  | 'official_api'      // Kaynağın kendi yayınladığı public API
  | 'open_data_api'     // Kamu kurumunun açık veri API'si
  | 'public_rest_api'   // CMS'in herkese açık REST uç noktası
  | 'structured_html'   // Sayfadaki schema.org / JSON-LD verisi
  | 'none'

export type Decision =
  | 'integrated'          // Şimdi entegre: çalışan ve izinli erişim doğrulandı
  | 'pending_permission'  // Teknik olarak mümkün, kullanım koşulları yazılı izin istiyor
  | 'blocked'             // Teknik erişim engeli (bot doğrulaması vb.) — aşılmaz
  | 'monitor'             // Güncel/yapılandırılmış veri yok; izlenecek
  | 'unsupported'         // Uygun değil

export interface SourceCatalogEntry {
  id: string
  name: string
  type: SourceType
  homepage: string
  cities: string[]
  eventTypes: string[]
  access: AccessMethod
  decision: Decision
  reason: string
  verifiedAt: string // YYYY-MM-DD: koşulların ve erişimin son kontrolü
  /** Organizatör kurum (resmi kaynaklarda) */
  organizer?: string
}

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  // ---------------- Entegre edilenler ----------------
  {
    id: 'bugece',
    name: 'BuGece',
    type: 'ticketing',
    homepage: 'https://bugece.co',
    cities: ['İstanbul', 'Ankara', 'İzmir'],
    eventTypes: ['konser', 'parti', 'festival', 'gece hayatı'],
    access: 'official_api',
    decision: 'integrated',
    reason: 'Herkese açık API (OpenAPI dokümanlı); robots.txt /api/list, /api/event ve /api/feeds uçlarına açıkça izin veriyor. Mekân, koordinat, saat, fiyat ve satış durumu sağlıyor.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'izmir-bb',
    name: 'İzmir Büyükşehir Belediyesi Kültürsanat',
    type: 'official',
    homepage: 'https://kultursanat.izmir.bel.tr',
    cities: ['İzmir'],
    eventTypes: ['sergi', 'konser', 'tiyatro', 'festival', 'çocuk'],
    access: 'open_data_api',
    decision: 'integrated',
    reason: 'İzmir BB açık veri API\'si (openapi.izmir.bel.tr). Seans tarihleri, mekân koordinatı, ücretsiz/biletli bilgisi ve bilet linki sağlıyor. Kapsam şimdilik sınırlı (API az kayıt dönüyor).',
    verifiedAt: '2026-10-04',
    organizer: 'İzmir Büyükşehir Belediyesi',
  },
  {
    id: 'kultur-istanbul',
    name: 'KÜLTÜR.İSTANBUL (İBB Kültür AŞ)',
    type: 'official',
    homepage: 'https://kultur.istanbul',
    cities: ['İstanbul'],
    eventTypes: ['konser', 'söyleşi', 'sergi', 'atölye', 'çocuk'],
    access: 'public_rest_api',
    decision: 'integrated',
    reason: 'WordPress public REST (event_listing) ile liste, etkinlik sayfasındaki yapılandırılmış alanlarla tarih/mekân/tür. robots.txt izinli. Koordinat yok; mekân adı geocode edilir. Kullanım koşulu metni ayrıca teyit edilmeli.',
    verifiedAt: '2026-10-04',
    organizer: 'İBB Kültür AŞ',
  },

  // ---------------- İzin bekleyenler ----------------
  {
    id: 'biletix',
    name: 'Biletix',
    type: 'ticketing',
    homepage: 'https://www.biletix.com',
    cities: ['Türkiye geneli'],
    eventTypes: ['konser', 'tiyatro', 'spor', 'aile', 'sergi'],
    access: 'structured_html',
    decision: 'pending_permission',
    reason: 'Sitemap ve eksiksiz Event JSON-LD var; ancak kullanım koşulları yazılı izin olmadan robot/örümcek/otomatik araç kullanımını yasaklıyor. İzin veya ortaklık sonrası açılabilir.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'biletinial',
    name: 'Biletinial',
    type: 'ticketing',
    homepage: 'https://biletinial.com',
    cities: ['Türkiye geneli'],
    eventTypes: ['tiyatro', 'konser', 'stand-up', 'çocuk', 'şehir tiyatroları'],
    access: 'structured_html',
    decision: 'pending_permission',
    reason: 'Event JSON-LD var (koordinat 0,0). Sözleşme içeriğin yazılı izin olmadan kopyalanmasını ve yayınlanmasını yasaklıyor. İBB/ABB Şehir Tiyatroları satışları da burada.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'passo',
    name: 'Passo',
    type: 'ticketing',
    homepage: 'https://www.passo.com.tr',
    cities: ['Türkiye geneli'],
    eventTypes: ['spor', 'konser', 'müze'],
    access: 'none',
    decision: 'pending_permission',
    reason: 'Sayfalar JavaScript ile yükleniyor, yapılandırılmış veri yok; kullanım koşulu metni okunamadı. Resmi işbirliği gerekir.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'mobilet',
    name: 'Mobilet',
    type: 'ticketing',
    homepage: 'https://mobilet.com',
    cities: ['Türkiye geneli'],
    eventTypes: ['eğitim', 'atölye', 'küçük etkinlik'],
    access: 'none',
    decision: 'pending_permission',
    reason: 'Etkinlik sayfalarında yapılandırılmış veri yok. Resmi işbirliği gerekir.',
    verifiedAt: '2026-10-04',
  },

  // ---------------- Teknik engel ----------------
  {
    id: 'bubilet',
    name: 'Bubilet',
    type: 'ticketing',
    homepage: 'https://www.bubilet.com.tr',
    cities: ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa'],
    eventTypes: ['konser', 'tiyatro', 'çocuk', 'atölye'],
    access: 'none',
    decision: 'blocked',
    reason: 'Bot doğrulaması (Cloudflare 403) dönüyor; engel atlatılmaz. Eski scraper devre dışı.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'biletino',
    name: 'Biletino',
    type: 'ticketing',
    homepage: 'https://biletino.com',
    cities: ['Türkiye geneli'],
    eventTypes: ['atölye', 'parti', 'küçük etkinlik'],
    access: 'none',
    decision: 'blocked',
    reason: 'Etkinlik sayfaları bot doğrulaması (403) dönüyor.',
    verifiedAt: '2026-10-04',
  },

  // ---------------- İzlenenler / desteklenmeyenler ----------------
  {
    id: 'eventbrite',
    name: 'Eventbrite',
    type: 'ticketing',
    homepage: 'https://www.eventbrite.com',
    cities: ['İstanbul'],
    eventTypes: ['networking', 'eğitim'],
    access: 'none',
    decision: 'unsupported',
    reason: 'Resmi etkinlik arama API\'si kapatılmış; kazımaya izin vermiyor; Türkiye kapsamı zayıf.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'lavarla',
    name: 'Lavarla',
    type: 'editorial',
    homepage: 'https://lavarla.com',
    cities: ['Ankara'],
    eventTypes: ['editoryal'],
    access: 'none',
    decision: 'unsupported',
    reason: 'Etkinlik takvimi eklentisi kaldırılmış (etkinlik sitemap\'i 404), site blog/haber yapısında; /wp-json robots.txt ile kapalı. Eski scraper devre dışı.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'timeout-istanbul',
    name: 'Time Out İstanbul',
    type: 'editorial',
    homepage: 'https://www.timeoutistanbul.com',
    cities: ['İstanbul'],
    eventTypes: ['editoryal öneri'],
    access: 'none',
    decision: 'unsupported',
    reason: 'Makale biçiminde editoryal içerik; tarihli/konumlu yapılandırılmış etkinlik verisi yok.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'visit-istanbul',
    name: 'Visit Istanbul (visitistanbulofficial.com)',
    type: 'editorial',
    homepage: 'https://visitistanbulofficial.com/tr/istanbul-events/',
    cities: ['İstanbul'],
    eventTypes: ['editoryal liste'],
    access: 'none',
    decision: 'monitor',
    reason: 'Etkinlik listesi var ama resmi kurum olduğu doğrulanamadı; içerik büyük ölçüde bilet platformlarının tekrarı.',
    verifiedAt: '2026-10-04',
  },
  {
    id: 'kultursanat-istanbul',
    name: 'İBB Kültür Sanat (kultursanat.istanbul)',
    type: 'official',
    homepage: 'https://kultursanat.istanbul',
    cities: ['İstanbul'],
    eventTypes: ['konser', 'tiyatro'],
    access: 'none',
    decision: 'monitor',
    reason: 'Listelenen en yeni etkinlikler 2023 tarihli; güncel takvim değil.',
    verifiedAt: '2026-10-04',
    organizer: 'İstanbul Büyükşehir Belediyesi',
  },
  {
    id: 'ibb-sehir-tiyatrolari',
    name: 'İBB Şehir Tiyatroları',
    type: 'official',
    homepage: 'https://sehirtiyatrolari.ibb.istanbul',
    cities: ['İstanbul'],
    eventTypes: ['tiyatro', 'çocuk tiyatrosu'],
    access: 'none',
    decision: 'monitor',
    reason: 'Oyun sayfalarında seans takvimi yok; seanslar Biletinial\'de satılıyor (Biletinial izniyle gelir).',
    verifiedAt: '2026-10-04',
    organizer: 'İstanbul Büyükşehir Belediyesi',
  },
  {
    id: 'ibb-acik-veri',
    name: 'İBB Açık Veri Portalı',
    type: 'official',
    homepage: 'https://data.ibb.gov.tr',
    cities: ['İstanbul'],
    eventTypes: ['istatistik'],
    access: 'none',
    decision: 'unsupported',
    reason: 'Etkinlikle ilgili veri setleri yalnızca istatistik (sayı/katılımcı); takvim değil.',
    verifiedAt: '2026-10-04',
    organizer: 'İstanbul Büyükşehir Belediyesi',
  },
  {
    id: 'ankara-bb',
    name: 'Ankara Büyükşehir Belediyesi Etkinlikler',
    type: 'official',
    homepage: 'https://www.ankara.bel.tr/etkinlikler',
    cities: ['Ankara'],
    eventTypes: ['kültür', 'spor', 'fuar', 'sergi', 'seminer'],
    access: 'none',
    decision: 'monitor',
    reason: 'Kategori sayfaları var (spor ayrı) ancak liste JavaScript ile yükleniyor ve kayıtların çoğu geçmiş tarihli; yapılandırılmış güncel takvim doğrulanamadı.',
    verifiedAt: '2026-10-04',
    organizer: 'Ankara Büyükşehir Belediyesi',
  },
  {
    id: 'ankara-bb-kultursanat',
    name: 'ABB Kültür Sanat (kultursanat.ankara.bel.tr)',
    type: 'official',
    homepage: 'https://kultursanat.ankara.bel.tr',
    cities: ['Ankara'],
    eventTypes: ['çeşitli'],
    access: 'none',
    decision: 'unsupported',
    reason: 'Belediyenin kendi etkinliklerini değil, bilet platformlarındaki etkinlikleri yeniden listeliyor ("Kaynak: bubilet"); organizatör verisi değil.',
    verifiedAt: '2026-10-04',
    organizer: 'Ankara Büyükşehir Belediyesi',
  },
]

export const getCatalogEntry = (id: string) => SOURCE_CATALOG.find(s => s.id === id)

/** Arayüzde kaynak adı ve türü göstermek için */
export const SOURCE_LABELS: Record<string, { name: string; type: SourceType }> = Object.fromEntries(
  SOURCE_CATALOG.map(s => [s.id, { name: s.name.replace(/\s*\(.*\)$/, ''), type: s.type }])
)

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  ticketing: 'Bilet platformu',
  editorial: 'Etkinlik rehberi',
  official: 'Resmi kurum',
}

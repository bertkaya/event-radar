// lib/sources/normalize.ts
// Kaynaklardan gelen ham değerleri uygulama modeline çeviren saf fonksiyonlar.

export const TZ = 'Europe/Istanbul'
// Türkiye 2016'dan beri yaz saati uygulamıyor: sabit UTC+03:00
const TR_OFFSET = '+03:00'

/** "2026-10-07T19:00:00" gibi ofsetsiz yerel zamanı İstanbul saatiyle ISO'ya çevirir. Ofset varsa korur. */
export function localToIso(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const v = value.trim().replace(' ', 'T')
  const hasOffset = /([zZ]|[+-]\d{2}:?\d{2})$/.test(v)
  const withSeconds = /T\d{2}:\d{2}$/.test(v) ? `${v}:00` : v
  const d = new Date(hasOffset ? withSeconds : `${withSeconds}${TR_OFFSET}`)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** "07-10-2026 19:00" veya "07.10.2026" (gün-ay-yıl). Saat yoksa undefined döner — tahmin etmez. */
export function parseDmy(value: string | null | undefined): { date: string; time?: string } | undefined {
  const m = (value || '').trim().match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (!m) return undefined
  const [, d, mo, y, h, mi] = m
  const date = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  return { date, time: h ? `${h.padStart(2, '0')}:${mi}` : undefined }
}

/** Yerel tarihin günü (YYYY-MM-DD, İstanbul saatiyle) — tekilleştirmede "aynı gün" karşılaştırması için */
export function localDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 10)
}

const CITY_ALIASES: Record<string, string> = {
  istanbul: 'İstanbul', 'i̇stanbul': 'İstanbul', 'istanbul avrupa': 'İstanbul', 'istanbul anadolu': 'İstanbul',
  ankara: 'Ankara', izmir: 'İzmir', 'i̇zmir': 'İzmir',
}

export function normalizeCity(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const key = value.trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i')
  return CITY_ALIASES[key] || CITY_ALIASES[value.trim().toLowerCase()] || undefined
}

export const SUPPORTED_CITIES = ['İstanbul', 'Ankara', 'İzmir']

// Uygulamadaki kategoriler: Müzik, Tiyatro, Stand-Up, Spor, Aile, Sanat, Eğitim, Festival, Sinema, Parti, Yeme-İçme
const CATEGORY_RULES: [RegExp, string][] = [
  [/stand[- ]?up|komedi/i, 'Stand-Up'],
  [/çocuk|cocuk|aile|kids|masal|kukla/i, 'Aile'],
  [/tiyatro|oyun|müzikal|muzikal|opera|bale/i, 'Tiyatro'],
  [/festival|fest\b/i, 'Festival'],
  [/sergi|müze|muze|sanat|fotoğraf|fotograf|resim|heykel|dans/i, 'Sanat'],
  [/sinema|film|gösterim|gosterim/i, 'Sinema'],
  [/atölye|atolye|workshop|söyleşi|soylesi|seminer|panel|konferans|eğitim|egitim|kurs|okuma/i, 'Eğitim'],
  [/spor|maç|mac\b|turnuva|koşu|kosu|yürüyüş|yuruyus|fitness|yoga|bisiklet/i, 'Spor'],
  [/house|techno|tekno|afro|melodic|electronic|elektronik|edm|trance|disco|club|parti|party|\bdj\b/i, 'Parti'],
  [/yemek|gastronomi|tadım|tadim|şarap|sarap|kahve/i, 'Yeme-İçme'],
  [/konser|müzik|muzik|caz|jazz|rock|pop|klasik|senfoni|orkestra|koro|resital|türkü|turku/i, 'Müzik'],
]

/** Kaynağın tür/etiket metinlerinden uygulama kategorisi. Eşleşme yoksa fallback. */
export function mapCategory(texts: (string | null | undefined)[], fallback = 'Müzik'): string {
  // Türkçe küçük harf: /i bayrağı "SERGİ"deki İ'yi i ile eşleştirmez
  const joined = texts.filter(Boolean).join(' ').toLocaleLowerCase('tr-TR')
  for (const [re, cat] of CATEGORY_RULES) if (re.test(joined)) return cat
  return fallback
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

export function stripHtml(html: string | null | undefined, max = 2000): string | undefined {
  if (!html) return undefined
  const text = decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
  if (!text) return undefined
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

/** "38,424833" → 38.424833; Türkiye sınırları dışındaysa undefined */
export function parseCoord(value: string | number | null | undefined, kind: 'lat' | 'lng'): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n === 0) return undefined
  const ok = kind === 'lat' ? n > 35 && n < 43 : n > 25 && n < 45
  return ok ? n : undefined
}

export function isHttpsUrl(u: string | null | undefined): u is string {
  try {
    return !!u && new URL(u).protocol === 'https:'
  } catch {
    return false
  }
}

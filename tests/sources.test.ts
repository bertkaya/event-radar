// npm test  (node:test + tsx)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localToIso, parseDmy, localDay, normalizeCity, mapCategory, parseCoord, stripHtml } from '../lib/sources/normalize'
import { matchScore, decideMatch, MERGE_THRESHOLD } from '../lib/sources/match'
import { mapBugeceHit } from '../scripts/ingest/adapters/bugece'
import { mapIzmirDetail } from '../scripts/ingest/adapters/izmir'
import { parseKulturPage } from '../scripts/ingest/adapters/kulturIstanbul'
import { isValid, qualifiesForAutoApproval } from '../scripts/ingest/store'
import { SOURCE_CATALOG } from '../lib/sources/catalog'

test('ofsetsiz yerel saat İstanbul (+03:00) kabul edilir, ofsetli korunur', () => {
  assert.equal(localToIso('2026-10-07T19:00:00'), '2026-10-07T16:00:00.000Z')
  assert.equal(localToIso('2026-10-07 19:00'), '2026-10-07T16:00:00.000Z')
  assert.equal(localToIso('2026-10-10T14:00:00.000Z'), '2026-10-10T14:00:00.000Z')
  assert.equal(localToIso('saçma'), undefined)
  assert.equal(localToIso(null), undefined)
})

test('gün-ay-yıl ayrıştırma saati uydurmaz', () => {
  assert.deepEqual(parseDmy('07-10-2026 19:00'), { date: '2026-10-07', time: '19:00' })
  assert.deepEqual(parseDmy(' 28-10-2026 '), { date: '2026-10-28', time: undefined })
  assert.equal(parseDmy('Ekim 2026'), undefined)
})

test('yerel gün gece yarısını İstanbul saatine göre böler', () => {
  assert.equal(localDay('2026-10-07T22:30:00.000Z'), '2026-10-08') // 01:30 yerel
  assert.equal(localDay('2026-10-07T20:30:00.000Z'), '2026-10-07') // 23:30 yerel
})

test('şehir normalizasyonu', () => {
  assert.equal(normalizeCity('Istanbul'), 'İstanbul')
  assert.equal(normalizeCity('İSTANBUL'), 'İstanbul')
  assert.equal(normalizeCity('izmir'), 'İzmir')
  assert.equal(normalizeCity('Kayseri'), undefined)
})

test('kategori eşleme', () => {
  assert.equal(mapCategory(['SERGİ']), 'Sanat')
  assert.equal(mapCategory(['Techno', 'House']), 'Parti')
  assert.equal(mapCategory(['Çocuk Tiyatrosu']), 'Aile')
  assert.equal(mapCategory(['Atölye & Eğitim']), 'Eğitim')
  assert.equal(mapCategory(['bilinmeyen'], 'Sanat'), 'Sanat')
})

test('koordinat: virgüllü ondalık, 0 ve Türkiye dışı reddedilir', () => {
  assert.equal(parseCoord('38,424833', 'lat'), 38.424833)
  assert.equal(parseCoord(0, 'lat'), undefined)
  assert.equal(parseCoord('51.5', 'lat'), undefined)
  assert.equal(parseCoord('', 'lng'), undefined)
})

test('HTML temizleme', () => {
  assert.equal(stripHtml('<p>A &amp; B</p><br/>C'), 'A & B\nC')
  assert.equal(stripHtml(''), undefined)
})

test('tekilleştirme: aynı etkinlik farklı yazımla birleşir, farklı şehir/gün birleşmez', () => {
  const a = { title: 'Mabel Matiz Konseri', startTime: '2026-11-01T17:00:00.000Z', city: 'İstanbul', venueName: 'Zorlu PSM' }
  const b = { title: 'MABEL MATİZ', startTime: '2026-11-01T17:00:00.000Z', city: 'İstanbul', venueName: 'Zorlu PSM Turkcell Sahnesi' }
  assert.ok(matchScore(a, b) >= MERGE_THRESHOLD, `skor ${matchScore(a, b)}`)
  assert.equal(matchScore(a, { ...b, city: 'Ankara' }), 0)
  assert.equal(matchScore(a, { ...b, startTime: '2026-11-03T17:00:00.000Z' }), 0)
  assert.equal(decideMatch(matchScore(a, { ...b, title: 'Başka Bir Gece' })).action, 'new')
})

test('BuGece eşleme: kuruş → TL, tükendi durumu, eksik alanda null', () => {
  const hit = {
    _id: 'x1', name: 'Gece', start_time: '2026-10-10T14:00:00.000Z', end_time: '2026-10-10T22:00:00.000Z', slug: 'gece-1',
    image: 'https://cdn.bugece.co/a', venue: { name: 'Life Park' }, city: { name: 'Istanbul' }, _geo: { lat: 41.16, lng: 29.0 },
    music_categories: [{ name: 'Techno' }],
  }
  const ev = mapBugeceHit(hit, { id: 'x1', url: '', variants: [{ price: { amount: 75000, currency: 'TRY' }, availability: { status: 'out_of_stock' } }] })!
  assert.equal(ev.city, 'İstanbul')
  assert.equal(ev.priceMin, 750)
  assert.equal(ev.status, 'sold_out')
  assert.equal(ev.category, 'Parti')
  assert.equal(ev.url, 'https://bugece.co/event/gece-1')
  assert.equal(ev.organizerName, undefined) // satıcı organizatör sayılmaz
  assert.equal(mapBugeceHit({ ...hit, city: { name: 'Kayseri' } }), null)
})

test('İzmir eşleme: seans başına kayıt, ücretsiz, mekân koordinatı', () => {
  const events = mapIzmirDetail(6583, {
    Adi: 'SERGİ: Deneme', Tur: 'SERGİ', Resim: 'http://kultursanat.izmir.bel.tr/a.jpg',
    EtkinlikMerkezi: { Adi: 'APİKAM', Adres: 'Şair Eşref Bulvari No:1-A &#199;ankaya', KoordinatX: '38,424833', KoordinatY: '27,1359314' },
    SeansListesi: [
      { SeansBaslangicTarihi: '2026-11-01T18:00:00', SeansBitisTarihi: '2026-12-13T18:00:00', UcretsizMi: true, BiletSatisLinki: null },
      { SeansBaslangicTarihi: '2026-11-02T20:00:00', UcretsizMi: false, BiletSatisLinki: 'https://kultursanat.izmir.bel.tr/x', SatisaSunusTarihi: '2099-01-01T00:00:00' },
    ],
  })
  assert.equal(events.length, 2)
  assert.equal(events[0].sourceEventId, '6583:2026-11-01T18:00:00')
  assert.equal(events[0].eventKind, 'free')
  assert.equal(events[0].lat, 38.424833)
  assert.equal(events[0].address, 'Şair Eşref Bulvari No:1-A Çankaya, İzmir')
  assert.equal(events[0].imageUrl, 'https://kultursanat.izmir.bel.tr/a.jpg')
  assert.equal(events[1].eventKind, 'ticketed')
  assert.equal(events[1].status, 'upcoming_sale')
})

test('KÜLTÜR.İSTANBUL: yalnızca kendi yan panelini okur, saatsiz etkinliği almaz', () => {
  const page = (dates: string) => `<html><head><meta property="og:title" content="Terasta Caz - KÜLTÜR.İSTANBUL"></head><body>
    <div class="wpem-event-title"><h3 class="wpem-heading-text">Terasta Caz</h3></div>
    <div class="wpem-single-event-sidebar-info">
      <div class="wpem-event-date-time">${dates}</div>
      <div class="wpem-event-type"><span class="wpem-event-type-text">Konser</span><span class="wpem-event-type-text">Ücretsiz</span></div>
      <div class="wpem-event-category"><span class="wpem-event-category-text">İstanbul Kitapçısı Kadıköy Şubesi</span></div>
    </div>
    <div class="related"><div class="wpem-event-type"><span class="wpem-event-type-text">Atölye</span></div></div>
  </body></html>`
  const ev = parseKulturPage(1, 'https://kultur.istanbul/etkinlik/terasta-caz/',
    page('<span class="wpem-event-date-time-text">07-10-2026 19:00</span> - <span class="wpem-event-date-time-text"> 28-10-2026 </span>'))!
  assert.equal(ev.title, 'Terasta Caz')
  assert.equal(ev.startTime, '2026-10-07T16:00:00.000Z')
  assert.equal(ev.endTime, '2026-10-28T20:59:00.000Z')
  assert.equal(ev.eventKind, 'free')
  assert.equal(ev.category, 'Müzik')
  assert.equal(ev.subType, 'Konser') // ilgili etkinliklerdeki "Atölye" sızmamalı
  assert.equal(ev.venueName, 'İstanbul Kitapçısı Kadıköy Şubesi')
  assert.equal(parseKulturPage(1, 'https://kultur.istanbul/x/', page('<span class="wpem-event-date-time-text">07-10-2026</span>')), null)
})

test('otomatik onay: geçmiş ya da yeri belirsiz etkinlik onaylanmaz', () => {
  const base = { sourceEventId: '1', url: 'https://x.co/e', title: 'Etkinlik', category: 'Müzik', startTime: '2999-01-01T18:00:00.000Z', timezone: 'Europe/Istanbul', city: 'İstanbul', venueName: 'Mekân', eventKind: 'ticketed' as const }
  assert.ok(qualifiesForAutoApproval(base))
  assert.ok(!qualifiesForAutoApproval({ ...base, startTime: '2000-01-01T18:00:00.000Z' }))
  assert.ok(!qualifiesForAutoApproval({ ...base, venueName: undefined }))
  assert.ok(!isValid({ ...base, city: 'Kayseri' }))
  assert.ok(!isValid({ ...base, url: 'http://x.co' }))
})

test('katalog: entegre kaynakların hepsinin bir adaptörü var', async () => {
  const { ADAPTERS } = await import('../scripts/ingest/adapters/index')
  const integrated = SOURCE_CATALOG.filter(s => s.decision === 'integrated').map(s => s.id).sort()
  assert.deepEqual(ADAPTERS.map(a => a.id).sort(), integrated)
})

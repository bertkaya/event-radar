// npm test  (node:test + tsx): ana sayfanın saf sabit ve yardımcıları (lib/home.ts)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRESET_LOCATIONS, DEFAULT_LOCATION, KIND_FILTERS, CATEGORIES, MOODS, hasCoords, formatDateRange, formatEuroDateTime } from '../lib/home'

test('konumlar: varsayılan "Tüm Şehirler", şehir adları ve koordinatlar geçerli', () => {
  assert.equal(DEFAULT_LOCATION.name, 'Tüm Şehirler')
  assert.equal(DEFAULT_LOCATION.city, null)
  assert.equal(new Set(PRESET_LOCATIONS.map((l) => l.name)).size, PRESET_LOCATIONS.length) // localStorage'da ada göre aranır: tekil olmalı
  for (const l of PRESET_LOCATIONS) {
    assert.ok(l.lat > 35 && l.lat < 43 && l.lng > 25 && l.lng < 46, `${l.name} Türkiye sınırları içinde değil`)
    assert.ok(l.zoom >= 5 && l.zoom <= 18)
  }
  assert.deepEqual([...new Set(PRESET_LOCATIONS.map((l) => l.city).filter(Boolean))].sort(), ['Ankara', 'İstanbul', 'İzmir'])
})

test('katılım şekli filtreleri: "Tümü" başta, anahtarlar tekil', () => {
  assert.equal(KIND_FILTERS[0].key, 'all')
  assert.deepEqual(KIND_FILTERS.map((k) => k.key), ['all', 'free', 'ticketed', 'registration', 'official'])
})

test('mod ve kategori tabloları', () => {
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length)
  assert.equal(Object.keys(MOODS).length, 5)
  for (const cats of Object.values(MOODS)) assert.ok(cats.length >= 2 && cats.every((c) => typeof c === 'string'))
})

test('hasCoords: yalnızca sonlu ve sıfırdan farklı koordinat geçerli', () => {
  assert.equal(hasCoords({ lat: 41, lng: 29 }), true)
  assert.equal(hasCoords({ lat: 0, lng: 0 }), false)      // kaynaklarda bilinmeyen konum 0,0 gelir
  assert.equal(hasCoords({ lat: null, lng: 29 }), false)
  assert.equal(hasCoords({ lat: 41 }), false)
  assert.equal(hasCoords({ lat: NaN, lng: 29 }), false)
})

test('tarih biçimleri: tek tarih, aynı gün aralığı ve çok günlü aralık (tr-TR, yerel saat)', () => {
  assert.equal(formatEuroDateTime('2026-10-17T18:30:00'), '17.10.2026 18:30')
  assert.equal(formatDateRange('2026-10-17T18:30:00'), '17.10.2026 18:30')
  assert.equal(formatDateRange('2026-10-17T18:30:00', '2026-10-17T21:00:00'), '17 Ekim 18:30 - 21:00')
  assert.equal(formatDateRange('2026-10-17T18:30:00', '2026-10-19T12:00:00'), '17 Eki - 19 Eki (18:30)')
})

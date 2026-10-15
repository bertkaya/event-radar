// npm test  (node:test + tsx): harita altlığı seçimi ve stil erişilebilirliği (lib/map_style.ts)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chooseBasemap, hasWebGL, styleReachable, OPENFREEMAP_STYLE, OPENFREEMAP_ATTRIBUTION, OSM_RASTER_URL, OSM_ATTRIBUTION } from '../lib/map_style'

test('varsayılan: WebGL varsa OpenFreeMap vektör altlığı, doğru atıfla', () => {
  const b = chooseBasemap({ webgl: true })
  assert.equal(b.kind, 'vector')
  if (b.kind === 'vector') {
    assert.equal(b.style, OPENFREEMAP_STYLE)
    assert.match(b.attribution, /OpenFreeMap/)
    assert.match(b.attribution, /OpenMapTiles/)
    assert.match(b.attribution, /OpenStreetMap/)
  }
  // OpenFreeMap'in istediği atıf metni (MapLibre dışındaki istemciler için zorunlu)
  assert.match(OPENFREEMAP_ATTRIBUTION, /OpenFreeMap.*OpenMapTiles.*Data from.*OpenStreetMap/)
})

test('NEXT_PUBLIC_MAP_TILE_URL tanımlıysa eski raster davranışı korunur (WebGL olsa bile)', () => {
  const b = chooseBasemap({ webgl: true, rasterUrl: 'https://tiles.example/{z}/{x}/{y}.png', rasterAttribution: 'Örnek' })
  assert.deepEqual(b, { kind: 'raster', url: 'https://tiles.example/{z}/{x}/{y}.png', attribution: 'Örnek', reason: 'env' })
  // atıf verilmemişse OSM atfı boş bırakılmaz
  assert.equal((chooseBasemap({ webgl: true, rasterUrl: 'https://x/{z}/{x}/{y}.png' }) as { attribution: string }).attribution, OSM_ATTRIBUTION)
  // boşluktan ibaret değer tanımsız sayılır
  assert.equal(chooseBasemap({ webgl: true, rasterUrl: '   ' }).kind, 'vector')
})

test('WebGL yoksa ya da vektör stili açılmadıysa OpenStreetMap rasterına düşer', () => {
  assert.deepEqual(chooseBasemap({ webgl: false }), { kind: 'raster', url: OSM_RASTER_URL, attribution: OSM_ATTRIBUTION, reason: 'no-webgl' })
  assert.deepEqual(chooseBasemap({ webgl: true, vectorFailed: true }), { kind: 'raster', url: OSM_RASTER_URL, attribution: OSM_ATTRIBUTION, reason: 'vector-failed' })
})

test('stil adresi ortam değişkeniyle değiştirilebilir', () => {
  const b = chooseBasemap({ webgl: true, styleUrl: 'https://tiles.openfreemap.org/styles/positron' })
  assert.equal(b.kind === 'vector' && b.style, 'https://tiles.openfreemap.org/styles/positron')
})

test('hasWebGL sunucuda (document yok) false döner, hata atmaz', () => {
  assert.equal(hasWebGL(), false)
})

test('styleReachable: 200 true; 5xx, ağ hatası ve zaman aşımı false', async () => {
  const ok = (async () => ({ ok: true })) as unknown as typeof fetch
  const bad = (async () => ({ ok: false })) as unknown as typeof fetch
  const boom = (async () => { throw new Error('ağ yok') }) as unknown as typeof fetch
  const hang = ((_u: string, init?: RequestInit) => new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('abort'))))) as unknown as typeof fetch
  assert.equal(await styleReachable('https://x/style', ok), true)
  assert.equal(await styleReachable('https://x/style', bad), false)
  assert.equal(await styleReachable('https://x/style', boom), false)
  assert.equal(await styleReachable('https://x/style', hang, 50), false)
})

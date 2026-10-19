import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeText, calculateSimilarity, areEventsDuplicate, deduplicateEvents } from '../lib/dedup'
import { scoreEventForUser, rankEvents } from '../lib/recommendation'
import { generateNightPlans } from '../lib/night_planner'
import type { Event } from '../lib/types'

const sampleEventA: Event = {
  id: 101,
  title: 'Mor ve Ötesi Konseri',
  venue_name: 'Zorlu PSM Turkcell Sahnesi',
  address: 'Beşiktaş, İstanbul',
  category: 'Müzik',
  price: '850 TL',
  min_price: 850,
  start_time: '2026-11-15T20:30:00.000Z',
  lat: 41.0665,
  lng: 29.0172,
  ticket_url: 'https://www.biletix.com/etkinlik/morveotesi',
  ai_mood: 'Kopmalık 🎸',
  is_featured: false,
  is_approved: true,
}

const sampleEventADup: Event = {
  id: 102,
  title: 'Mor ve Ötesi Biletleri',
  venue_name: 'Zorlu PSM',
  address: 'Beşiktaş, İstanbul',
  category: 'Müzik',
  price: '790 TL',
  min_price: 790,
  start_time: '2026-11-15T21:00:00.000Z',
  lat: 41.0665,
  lng: 29.0172,
  ticket_url: 'https://www.passo.com.tr/tr/etkinlik/mor-ve-otesi',
  image_url: 'https://example.com/mvo.jpg',
  description: 'Türk rock müziğinin efsane grubu Mor ve Ötesi unutulmaz şarkılarıyla Zorlu PSM sahnesinde!',
  is_approved: true,
}

const sampleEventB: Event = {
  id: 103,
  title: 'Cem Yılmaz - CMXXIV Stand-Up',
  venue_name: 'Congresium Ankara',
  address: 'Çankaya, Ankara',
  category: 'Stand-Up',
  price: '1200 TL',
  min_price: 1200,
  start_time: '2026-11-15T20:00:00.000Z',
  lat: 39.9119,
  lng: 32.8027,
  ticket_url: 'https://biletinial.com/tr-tr/stand-up/cmxxiv',
  ai_mood: 'Parti & Eğlence 🎉',
  is_featured: true,
  is_approved: true,
}

test('dedup: normalizeText ve calculateSimilarity Türkçe ekleri ve sonekleri temizler', () => {
  assert.equal(normalizeText('Mor ve Ötesi Konseri!'), 'mor ve otesi')
  assert.ok(calculateSimilarity('Mor ve Ötesi Konseri', 'Mor ve Ötesi Biletleri') >= 0.9)
  assert.equal(calculateSimilarity('Tamamen Farklı Sergi', 'Klasik Bale Gösterisi'), 0)
})

test('dedup: areEventsDuplicate ve deduplicateEvents farklı bilet sitelerini tek etkinlikte birleştirir', () => {
  assert.equal(areEventsDuplicate(sampleEventA, sampleEventADup), true)
  assert.equal(areEventsDuplicate(sampleEventA, sampleEventB), false)

  const merged = deduplicateEvents([sampleEventA, sampleEventADup, sampleEventB])
  assert.equal(merged.length, 2)
  const mvo = merged.find((e) => e.id === 101)!
  assert.equal(mvo.min_price, 790)
  assert.equal(mvo.image_url, 'https://example.com/mvo.jpg')
  assert.equal(mvo.ticket_sources?.length, 2)
  assert.deepEqual(
    mvo.ticket_sources?.map((s) => s.source),
    ['Biletix', 'Passo']
  )
})

test('recommendation: scoreEventForUser ve rankEvents kullanıcı sinyallerine göre puanlar ve sıralar', () => {
  const res = scoreEventForUser(sampleEventA, {
    preferences: ['Müzik'],
    favoriteEventIds: [],
    userLat: 41.067,
    userLng: 29.018,
    maxBudget: 1000,
    activeMood: 'Kopmalık 🎸',
  })
  assert.ok(res.score >= 85 && res.score <= 99)
  assert.ok(res.distanceKm !== undefined && res.distanceKm < 1)
  assert.ok(res.walkMinutes !== undefined && res.walkMinutes <= 15)

  const ranked = rankEvents([sampleEventA, sampleEventB], {
    preferences: ['Müzik'],
    favoriteEventIds: [],
    maxBudget: 1000,
  })
  // sampleEventB is featured so it ranks first
  assert.equal(ranked[0].id, 103)
  assert.equal(ranked[1].id, 101)
})

test('night_planner: generateNightPlans yemek + etkinlik + gece kapanışı adımlarından oluşan plan üretir', () => {
  const plans = generateNightPlans([sampleEventA, sampleEventB], {
    city: 'İstanbul',
    budget: 2000,
    partyType: 'friends',
  })
  assert.ok(plans.length >= 1)
  const planA = plans[0]
  assert.equal(planA.steps.length, 3)
  assert.equal(planA.steps[0].type, 'dinner')
  assert.equal(planA.steps[1].isMainEvent, true)
  assert.equal(planA.steps[2].type, 'nightcap')
})

// lib/nlp_filter.ts
// Natural Language to Structured Filter Parser for 18-23

export interface StructuredFilters {
  city?: string;
  category?: string;
  mood?: string;
  timeFilter?: 'all' | 'today' | 'tomorrow' | 'weekend';
  maxBudget?: number;
  freeOnly?: boolean;
  searchQuery?: string;
  originalPrompt: string;
}

export function parseNaturalLanguageQuery(query: string): StructuredFilters {
  const q = (query || '').toLowerCase().trim();
  const filters: StructuredFilters = {
    originalPrompt: query
  };

  // 1. Detect City
  if (q.includes('istanbul') || q.includes('kadıköy') || q.includes('beşiktaş') || q.includes('beyoğlu') || q.includes('şişli') || q.includes('moda') || q.includes('üsküdar')) {
    filters.city = 'İstanbul';
  } else if (q.includes('ankara') || q.includes('çankaya') || q.includes('tunalı') || q.includes('kızılay') || q.includes('bahçelievler')) {
    filters.city = 'Ankara';
  } else if (q.includes('izmir') || q.includes('alsancak') || q.includes('konak') || q.includes('karşıyaka') || q.includes('bornova') || q.includes('bostanlı')) {
    filters.city = 'İzmir';
  }

  // 2. Detect Time
  if (q.includes('bu akşam') || q.includes('bugün') || q.includes('bu gece')) {
    filters.timeFilter = 'today';
  } else if (q.includes('yarın') || q.includes('yarın akşam')) {
    filters.timeFilter = 'tomorrow';
  } else if (q.includes('hafta sonu') || q.includes('cumartesi') || q.includes('pazar')) {
    filters.timeFilter = 'weekend';
  }

  // 3. Detect Budget / Free
  if (q.includes('ücretsiz') || q.includes('bedava') || q.includes('parasız') || /(^|\s)0\s*(tl|lira|₺)/.test(q)) {
    filters.freeOnly = true;
    filters.maxBudget = 0;
  } else {
    // Regex to match "500 tl", "1000tl", "300 lira"
    const budgetMatch = q.match(/(\d+)\s*(?:tl|lira|₺)/);
    if (budgetMatch) {
      filters.maxBudget = parseInt(budgetMatch[1], 10);
    }
  }

  // 4. Detect Mood
  if (q.includes('date') || q.includes('romantik') || q.includes('sevgili') || q.includes('baş başa')) {
    filters.mood = 'Date Night 🍷';
  } else if (q.includes('kopmalık') || q.includes('parti') || q.includes('enerjik') || q.includes('coşkulu')) {
    filters.mood = 'Kopmalık 🎸';
  } else if (q.includes('chill') || q.includes('sakin') || q.includes('sanat') || q.includes('kafa dinleme')) {
    filters.mood = 'Chill & Sanat 🎨';
  } else if (q.includes('aile') || q.includes('çocuk') || q.includes('ailece')) {
    filters.mood = 'Ailece 👨‍👩‍👧‍👦';
  } else if (q.includes('öğren') || q.includes('atölye') || q.includes('geliştir') || q.includes('workshop')) {
    filters.mood = 'Kendini Geliştir 🧠';
  }

  // 5. Detect Category
  if (q.includes('konser') || q.includes('müzik') || q.includes('caz') || q.includes('jazz') || q.includes('rock') || q.includes('canlı müzik')) {
    filters.category = 'Müzik';
  } else if (q.includes('tiyatro') || q.includes('oyun') || q.includes('müzikal')) {
    filters.category = 'Tiyatro';
  } else if (q.includes('stand-up') || q.includes('stand up') || q.includes('komedi') || q.includes('kahkaha')) {
    filters.category = 'Stand-Up';
  } else if (q.includes('sergi') || q.includes('müze') || q.includes('galeri')) {
    filters.category = 'Sanat';
  } else if (q.includes('sinema') || q.includes('film')) {
    filters.category = 'Sinema';
  } else if (q.includes('atölye') || q.includes('workshop')) {
    filters.category = 'Workshop';
  }

  // Artakalan anahtar kelimeler metin araması olur. Yalnızca gerçek ad/yer kelimeleri kalmalı:
  // eş-ek ('de), sayı/para, kalıp ifadeler ve zaten filtreye dönüşmüş sözcükler çıkarılır; aksi halde
  // "Kadıköy'de bu akşam 400 TL altı konser" gibi doğal bir cümle hiç sonuç döndürmez.
  const CONSUMED = new Set([
    'istanbul', 'ankara', 'izmir', 'kadıköy', 'beşiktaş', 'beyoğlu', 'şişli', 'moda', 'üsküdar', 'çankaya', 'tunalı', 'kızılay',
    'bahçelievler', 'alsancak', 'konak', 'karşıyaka', 'bornova', 'bostanlı',
    'bu', 'akşam', 'gece', 'bugün', 'yarın', 'hafta', 'sonu', 'cumartesi', 'pazar',
    'ücretsiz', 'bedava', 'parasız', 'tl', 'lira', '₺', 'altı', 'altında', 'üstü', 'üzeri', 'kadar', 'max',
    'bir', 'için', 'ile', 'olan', 'bana', 'bul', 'öner', 'var', 'mı', 'mi', 'etkinlik', 'etkinlikler', 'ara', 'istiyorum',
  ]);
  if (filters.category) {
    for (const w of ['konser', 'müzik', 'caz', 'jazz', 'rock', 'canlı', 'tiyatro', 'oyun', 'müzikal', 'stand-up', 'stand', 'up',
      'komedi', 'kahkaha', 'sergi', 'müze', 'galeri', 'sinema', 'film', 'atölye', 'workshop']) CONSUMED.add(w);
  }
  if (filters.mood) {
    for (const w of ['date', 'romantik', 'sevgili', 'baş', 'başa', 'kopmalık', 'parti', 'enerjik', 'coşkulu', 'chill', 'sakin', 'sanat',
      'kafa', 'dinleme', 'aile', 'çocuk', 'ailece', 'öğren', 'geliştir']) CONSUMED.add(w);
  }
  filters.searchQuery = q
    .replace(/['’][a-zçğıöşü]{1,3}(?=\s|$)/g, '')        // Kadıköy'de → Kadıköy
    .split(/[\s,.;:!?]+/)
    .filter((w) => w && !/^\d+(tl|₺)?$/.test(w) && !CONSUMED.has(w) && ![...CONSUMED].some((c) => c.length >= 5 && w.startsWith(c) && w.length <= c.length + 3)) // konseri/konserler gibi çekimler
    .join(' ')
    .trim();

  return filters;
}

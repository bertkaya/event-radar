// Tarih formatlayıcı yardımcı fonksiyon
const getToday = () => new Date().toISOString().split('T')[0];
const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

// Örnek veriler
const INITIAL_EVENTS = [
  {
    id: 1,
    title: 'Jazz & Wine Night',
    description: 'Şehrin en iyi saksafoncuları eşliğinde unutulmaz bir gece.',
    venue_name: 'The Jazz Bar, Beyoğlu',
    category: 'Müzik',
    start_time: `${getToday()}T20:00:00`, // Bugün
    lat: 41.0335,
    lng: 28.9778,
    price: '250 TL',
  },
  {
    id: 2,
    title: 'Stand-up: Açık Mikrofon',
    description: 'Gülmek garanti. Amatör komedyenler sahnede.',
    venue_name: 'BKM Mutfak, Beşiktaş',
    category: 'Komedi',
    start_time: `${getTomorrow()}T21:00:00`, // Yarın
    lat: 41.0422,
    lng: 29.0060,
    price: '150 TL',
  },
  {
    id: 3,
    title: 'Modern Sanat Sergisi',
    description: 'Çağdaş sanatçıların eserlerinden oluşan özel koleksiyon.',
    venue_name: 'İstanbul Modern',
    category: 'Sanat',
    start_time: `${getToday()}T18:30:00`, // Bugün
    lat: 41.0258,
    lng: 28.9835,
    price: 'Ücretsiz',
  },
  {
    id: 4,
    title: 'Basketbol Maçı: Efes vs FB',
    description: 'Euroleague heyecanı Sinan Erdem\'de.',
    venue_name: 'Sinan Erdem Spor Salonu',
    category: 'Spor',
    start_time: `${getToday()}T20:00:00`, // Bugün
    lat: 40.9880,
    lng: 28.8500,
    price: '400 TL',
  }
];

export const getLocalEvents = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('events');
  if (!stored) {
    localStorage.setItem('events', JSON.stringify(INITIAL_EVENTS));
    return INITIAL_EVENTS;
  }
  return JSON.parse(stored);
};

export const addLocalEvent = (event: any) => {
  const events = getLocalEvents();
  const newEvent = { ...event, id: Date.now() };
  localStorage.setItem('events', JSON.stringify([newEvent, ...events]));
};
// lib/storage.ts

// Başlangıç verileri (Veritabanı boş kalmasın diye)
const INITIAL_EVENTS = [
  {
    id: 1,
    title: 'Jazz ve Şarap Gecesi',
    venue_name: 'The Jazz Bar, Beyoğlu',
    category: 'Müzik',
    start_time: '2023-11-20T20:00:00',
    lat: 41.0335,
    lng: 28.9778,
    price: '250 TL',
  },
  {
    id: 2,
    title: 'Stand-up Gösterisi',
    venue_name: 'BKM Mutfak, Beşiktaş',
    category: 'Komedi',
    start_time: '2023-11-21T21:00:00',
    lat: 41.0422,
    lng: 29.0060,
    price: '150 TL',
  }
];

// Verileri getir
export const getLocalEvents = () => {
  if (typeof window === 'undefined') return []; // Sunucuda çalışma
  
  const stored = localStorage.getItem('events');
  if (!stored) {
    // İlk kez açılıyorsa başlangıç verilerini kaydet
    localStorage.setItem('events', JSON.stringify(INITIAL_EVENTS));
    return INITIAL_EVENTS;
  }
  return JSON.parse(stored);
};

// Yeni veri ekle
export const addLocalEvent = (event: any) => {
  const events = getLocalEvents();
  const newEvent = { ...event, id: Date.now() }; // Rastgele ID ver
  const updatedEvents = [newEvent, ...events];
  localStorage.setItem('events', JSON.stringify(updatedEvents));
  return newEvent;
};
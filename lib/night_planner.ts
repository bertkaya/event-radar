// lib/night_planner.ts
// AI & Algorithmic Night Planning Engine for 18-23

import type { Event } from './types';

export interface NightPlanStep {
  time: string;
  title: string;
  type: 'dinner' | 'event' | 'nightcap' | 'walk' | 'coffee';
  placeName: string;
  description: string;
  estimatedCost: string;
  isMainEvent?: boolean;
  eventRef?: Event;
  mapsQuery?: string;
}

export interface NightPlan {
  id: string;
  planTitle: string;
  tagline: string;
  mood: string;
  totalEstimatedCost: string;
  totalDurationHours: number;
  steps: NightPlanStep[];
  city: string;
  targetDate: string;
}

export interface NightPlannerInput {
  city: string;
  mood?: string;
  budget?: number;
  partyType?: 'date' | 'friends' | 'solo' | 'family';
  targetDate?: string;
  userPrompt?: string;
}

/**
 * Builds realistic pre-event and post-event dining/cocktail suggestions
 * based on the city and the event venue's neighborhood.
 */
function getSurroundingSpots(venueName: string, city: string, partyType: string) {
  const isKadikoy = venueName.toLowerCase().includes('kadıköy') || venueName.toLowerCase().includes('bostancı') || venueName.toLowerCase().includes('moda');
  const isBesiktas = venueName.toLowerCase().includes('beşiktaş') || venueName.toLowerCase().includes('zorlu') || venueName.toLowerCase().includes('bkm');
  const isBeyoglu = venueName.toLowerCase().includes('beyoğlu') || venueName.toLowerCase().includes('modern') || venueName.toLowerCase().includes('karaköy');
  const isAnkara = city.toLowerCase().includes('ankara') || venueName.toLowerCase().includes('cso') || venueName.toLowerCase().includes('tunalı') || venueName.toLowerCase().includes('cermodern');
  const isIzmir = city.toLowerCase().includes('izmir') || venueName.toLowerCase().includes('alsancak') || venueName.toLowerCase().includes('havagazı');

  if (isAnkara) {
    return {
      dinner: {
        name: 'Tunalı & Kuğulu Gastronomi Noktası',
        desc: 'Etkinlik öncesi sakin bir akşam yemeği veya lezzetli mezeler eşliğinde sohbet.',
        cost: '350 - 550 TL'
      },
      post: {
        name: 'Kuğulu Park & Kızılay Gece Yürüyüşü',
        desc: 'Konser/etkinlik sonrası sıcak bir kahve veya tatlı ile akşamı sonlandırma.',
        cost: '100 - 180 TL'
      }
    };
  }

  if (isIzmir) {
    return {
      dinner: {
        name: 'Alsancak Kordon Sahil Restoranları',
        desc: 'Körfez esintisinde gün batımına karşı enfes Ege lezzetleri.',
        cost: '300 - 500 TL'
      },
      post: {
        name: 'Kıbrıs Şehitleri Tatlı & Kokteyl Molası',
        desc: 'Çimlerde veya sevimli bir kafede geceyi keyifle kapatın.',
        cost: '120 - 200 TL'
      }
    };
  }

  if (isBesiktas) {
    return {
      dinner: {
        name: 'Akaretler & Çarşı Çevresi Akşam Yemeği',
        desc: 'Mekana 10 dakika mesafede modern bistrolarda enerjik bir akşam başlangıcı.',
        cost: '400 - 650 TL'
      },
      post: {
        name: 'Ortaköy / Boğaz Hattı Tatlı Molası',
        desc: 'Etkinlik çıkışı Boğaz havası alarak keyifli bir yürüyüş.',
        cost: '150 - 250 TL'
      }
    };
  }

  if (isKadikoy) {
    return {
      dinner: {
        name: 'Moda & Caferağa Butik Restoranları',
        desc: 'Samimi, loş ışıklı ve kaliteli müzik çalan lezzet durakları.',
        cost: '350 - 550 TL'
      },
      post: {
        name: 'Moda Sahili Gece Yürüyüşü & Kokteyl',
        desc: 'Deniz kokusu eşliğinde günü değerlendirme ve sohbet.',
        cost: '120 - 220 TL'
      }
    };
  }

  // Default Fallback
  return {
    dinner: {
      name: `${venueName} Yakınında Akşam Yemeği`,
      desc: 'Etkinliğe yürüyüş mesafesinde şık ve lezzetli bir akşam yemeği.',
      cost: '350 - 600 TL'
    },
    post: {
      name: 'Mekan Çevresinde Kokteyl & Tatlı Durağı',
      desc: 'Etkinlik sonrası tempoyu düşürüp günü tamamlayacağınız samimi bir nokta.',
      cost: '150 - 220 TL'
    }
  };
}

/**
 * Generates tailored evening plans (Plan A and Plan B) using real events from the database.
 */
export function generateNightPlans(events: Event[], input: NightPlannerInput): NightPlan[] {
  // 1. Filter events matching city and optional budget
  let candidateEvents = events.filter(e => {
    if (input.city && input.city !== 'Tümü') {
      const matchCity = (e.address || '' + e.venue_name).toLowerCase().includes(input.city.toLowerCase());
      if (!matchCity) return false;
    }
    if (input.budget && input.budget > 0) {
      if (e.min_price && e.min_price > input.budget) return false;
    }
    return true;
  });

  if (candidateEvents.length === 0) {
    candidateEvents = events.slice(0, 4); // Fallback to any top events
  }

  // Sort candidates by featured and start time
  candidateEvents.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));

  const plans: NightPlan[] = [];

  // Build Plan A (Primary Recommendation)
  if (candidateEvents.length > 0) {
    const primaryEvent = candidateEvents[0];
    const spots = getSurroundingSpots(primaryEvent.venue_name, input.city || 'İstanbul', input.partyType || 'date');

    const eventDate = new Date(primaryEvent.start_time);
    const eventTimeStr = !isNaN(eventDate.getTime()) 
      ? `${eventDate.getHours().toString().padStart(2, '0')}:${eventDate.getMinutes().toString().padStart(2, '0')}`
      : '20:30';

    const dinnerHour = Math.max(18, (parseInt(eventTimeStr.split(':')[0]) || 20) - 2);
    const dinnerTimeStr = `${dinnerHour.toString().padStart(2, '0')}:30`;

    const postHour = Math.min(23, (parseInt(eventTimeStr.split(':')[0]) || 20) + 2);
    const postTimeStr = `${postHour.toString().padStart(2, '0')}:15`;

    const ticketPriceNum = primaryEvent.min_price || 0;
    const estTotal = ticketPriceNum + 500; // Ticket + dinner/drink average

    plans.push({
      id: 'plan-a',
      planTitle: `${primaryEvent.ai_mood || 'Keyifli'} Akşam Rotası`,
      tagline: `${primaryEvent.venue_name} odaklı eksiksiz gece planı`,
      mood: primaryEvent.ai_mood || 'Dolu Dolu 🌟',
      totalEstimatedCost: `${estTotal} - ${estTotal + 300} TL (2 Kişi)`,
      totalDurationHours: 4.5,
      city: input.city || 'İstanbul',
      targetDate: 'Bu Akşam',
      steps: [
        {
          time: dinnerTimeStr,
          title: 'Akşam Yemeği & Sohbet',
          type: 'dinner',
          placeName: spots.dinner.name,
          description: spots.dinner.desc,
          estimatedCost: spots.dinner.cost,
          mapsQuery: `${spots.dinner.name} near ${primaryEvent.venue_name}`
        },
        {
          time: eventTimeStr,
          title: primaryEvent.title,
          type: 'event',
          placeName: primaryEvent.venue_name,
          description: primaryEvent.summary || primaryEvent.description || 'Gecenin ana etkinliği.',
          estimatedCost: primaryEvent.price || 'Bilet Gerekli',
          isMainEvent: true,
          eventRef: primaryEvent,
          mapsQuery: primaryEvent.address || primaryEvent.venue_name
        },
        {
          time: postTimeStr,
          title: 'Gece Kapanışı & Tatlı / İçecek',
          type: 'nightcap',
          placeName: spots.post.name,
          description: spots.post.desc,
          estimatedCost: spots.post.cost,
          mapsQuery: `${spots.post.name} ${primaryEvent.venue_name}`
        }
      ]
    });
  }

  // Build Plan B (Alternative Plan if a 2nd candidate exists)
  if (candidateEvents.length > 1) {
    const secondEvent = candidateEvents[1];
    const spots = getSurroundingSpots(secondEvent.venue_name, input.city || 'İstanbul', input.partyType || 'solo');

    const eventDate = new Date(secondEvent.start_time);
    const eventTimeStr = !isNaN(eventDate.getTime()) 
      ? `${eventDate.getHours().toString().padStart(2, '0')}:${eventDate.getMinutes().toString().padStart(2, '0')}`
      : '20:00';

    const estTotal = (secondEvent.min_price || 0) + 400;

    plans.push({
      id: 'plan-b',
      planTitle: `Alternatif: ${secondEvent.category} & Keşif`,
      tagline: `${secondEvent.title} ile sakin ve kaliteli bir akşam`,
      mood: secondEvent.ai_mood || 'Chill & Sanat 🎨',
      totalEstimatedCost: `${estTotal} - ${estTotal + 250} TL`,
      totalDurationHours: 3.5,
      city: input.city || 'İstanbul',
      targetDate: 'Bu Akşam',
      steps: [
        {
          time: '19:00',
          title: 'Kahve & Aperitif Molası',
          type: 'coffee',
          placeName: `${secondEvent.venue_name} Çevresi`,
          description: 'Etkinlik öncesi güne mola verip kafa dinleme.',
          estimatedCost: '150 - 250 TL'
        },
        {
          time: eventTimeStr,
          title: secondEvent.title,
          type: 'event',
          placeName: secondEvent.venue_name,
          description: secondEvent.summary || secondEvent.description || 'Gecenin öne çıkan etkinliği.',
          estimatedCost: secondEvent.price || 'Giriş Serbest',
          isMainEvent: true,
          eventRef: secondEvent
        },
        {
          time: '22:15',
          title: 'Sakin Gece Yürüyüşü',
          type: 'walk',
          placeName: 'Mekan Çevresi Caddeler',
          description: 'Hafif tempolu yürüyüş ile akşamı keyifle tamamlama.',
          estimatedCost: 'Ücretsiz'
        }
      ]
    });
  }

  return plans;
}

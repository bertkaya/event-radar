export interface Venue {
  id: number;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  maps_url?: string;
  city?: string;
  created_at?: string;
}

export interface Organizer {
  id: number;
  name: string;
  logo_url?: string;
  description?: string;
  contact_email?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  created_at?: string;
}

export interface TicketDetail {
  name: string;
  price: string;
  status?: string;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;

  // Location
  venue_name: string;
  venue_id?: number;
  lat: number;
  lng: number;
  address?: string;
  maps_url?: string;

  // Ticket & Pricing
  price: string;
  min_price?: number | null;
  ticket_url?: string;
  ticket_details?: TicketDetail[];
  ticket_sources?: { source: string; url: string; price: string }[];

  // Category & Classification
  category: string;
  tags?: string[];
  ai_mood?: string;

  // Media
  image_url?: string;
  media_url?: string;
  summary?: string;

  // Status
  is_approved: boolean;
  sold_out?: boolean;

  // Featured / Sponsorship
  is_featured?: boolean;
  feature_priority?: number;
  sponsor_logo?: string;
  sponsor_name?: string;

  // Rules / Info
  rules?: string;

  // Metadata
  source_url?: string;
  organizer_id?: number;

  // Joins
  venues?: Venue;
  organizers?: Organizer;
}

export type LatLng = { lat: number; lng: number };

export interface MapLocation extends LatLng {
  name?: string;
  zoom: number;
}

/** Listeden (ScoredEvent) ya da düz Event olarak seçilebilen etkinlik */
export type SelectableEvent = Event & {
  matchScore?: number;
  matchReason?: string;
  distanceKm?: number;
  walkMinutes?: number;
};

export interface Review {
  id: number;
  event_id: number;
  user_id: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface VenueApplication {
  id: number;
  venue_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  message?: string;
  created_at: string;
}

export interface ScraperLog {
  id: number;
  scraper_name: string;
  status: 'running' | 'success' | 'failed';
  events_count: number;
  error_message?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  preferences?: string[];
  playlist_url?: string;
  music_vibe?: string;
}

/** Excel / sheet_to_json satırı */
export type SheetRow = Record<string, string | number | boolean | undefined>;

/** e?.stopPropagation() çağrılan, event'i opsiyonel handler'lar */
export type MaybeEvent = { stopPropagation(): void } | null | undefined;

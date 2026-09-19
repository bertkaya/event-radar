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

  // Category & Classification
  category: string;
  tags?: string[];
  ai_mood?: string;

  // Media
  image_url?: string;
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

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

export interface Event {
    id: number;
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;

    // Location
    venue_name: string; // Legacy/Fallback
    venue_id?: number;
    lat: number;
    lng: number;
    address?: string;
    maps_url?: string;

    // Details
    price: string;
    category: string;
    image_url?: string;
    ticket_url?: string;
    is_approved: boolean;

    // New Fields
    organizer_id?: number;
    rules?: string;
    source_url?: string;
    tags?: string[];

    // Joins (optional, depending on query)
    venues?: Venue;
    organizers?: Organizer;
}

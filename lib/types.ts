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
    rules?: string | string[]; // Can be string (DB) or array (Scraper) - DB is text array usually or text? SQL says rules TEXT, scraper uses string[]. Let's match DB. Scraper sends string array, but DB updates.sql said rules TEXT? No, looking at db_updates.sql: ADD COLUMN IF NOT EXISTS rules TEXT. So it's a single string in DB. Scraper should join it. 
    // Wait, let's double check run_scrapers logic. 
    // Passo scraper: rules: eventData.ruleItems (string[])
    // Supabase column: rules TEXT.
    // If we send string[] to TEXT column, supabase might reject or stringify.
    // Ideally validation step should have caught this.
    // I should fix the type here to be generic or check what supabase expects.
    // Actually, I should update the Scrapers to join('\n') or update DB to TEXT[].
    // db_updates.sql line 40: rules TEXT.
    // So Scrapers should join.
    // I will keep it as string here for Frontend.

    source_url?: string;
    ticket_details?: TicketDetail[]; // JSONB
    tags?: string[];

    // Joins
    venues?: Venue;
    organizers?: Organizer;
}

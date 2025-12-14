export interface TicketDetail {
    name: string;
    price: string;
    status?: string; // 'available', 'sold_out', etc.
}

export interface TicketSource {
    source: string; // 'bubilet', 'biletinial', etc.
    url: string;
    price: string;
}

export interface Event {
    title: string;
    venue_name: string;
    address?: string;
    start_time: string; // ISO string
    end_time?: string; // ISO string
    description?: string;
    image_url?: string;
    source_url: string;
    lat?: number;
    lng?: number;
    maps_url?: string;
    is_approved: boolean; // default false, requires moderation
    category?: string;
    price?: string; // Lowest price or range string
    ticket_details?: TicketDetail[];
    ticket_sources?: TicketSource[]; // Different providers for same event
    rules?: string[];
    tags?: string[];
    organizer_id?: number;
    venue_id?: number;
}

export interface Scraper {
    name: string;
    scrape(): Promise<Event[]>;
}

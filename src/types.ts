export interface InputSchema {
  eventUrls?: string[];
  query?: string;
  source?: 'luma' | 'eventbrite' | 'both';
  city?: string;
  maxResults: number;
}

export interface OrganizerLead {
  eventName: string;
  eventUrl: string;
  eventDate?: string;
  organizerName?: string;
  organizerWebsite?: string;
  organizerLinkedIn?: string;
  organizerEmail?: string;
  organizerInstagram?: string;
  organizerTwitter?: string;
  source: 'luma' | 'eventbrite' | 'other';
  scrapedAt: string;
}

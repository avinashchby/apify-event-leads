# Event Organizer Lead Extractor

> **What this actor does:** Visits Luma and Eventbrite event pages and extracts organizer contact info — name, email, LinkedIn, website, Instagram, and Twitter. Turn a list of event URLs (or a keyword search) into an outreach-ready lead list.

## Features

- **Two input modes**: URL list mode OR keyword search mode
- Extracts: organizer name, email, LinkedIn URL, website, Instagram, Twitter
- Supports **Luma** (lu.ma) and **Eventbrite** event pages
- In search mode: auto-discovers event URLs then visits each page
- No API key required
- Output: structured JSON compatible with Apollo, Instantly, Smartlead, and HubSpot CSV import

## Use Cases

- **Cold email outreach**: Find emails of event organizers in your niche
- **Partnership development**: Identify companies running events in your space
- **Sponsorship prospecting**: Discover organizers of conferences and summits to sponsor
- **Community research**: Map who's organizing events in a specific city or industry
- **Sales intelligence**: Build targeted lists of event-driven companies

## Input Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `eventUrls` | array | List of Luma or Eventbrite event URLs | — |
| `query` | string | Search keyword (if no URLs provided) | — |
| `source` | string | "luma", "eventbrite", or "both" (search mode) | "luma" |
| `city` | string | City filter for search mode | — |
| `maxResults` | number | Max leads to extract | 50 |

## Output Fields

| Field | Description |
|-------|-------------|
| `eventName` | Event title |
| `eventUrl` | Event page URL |
| `eventDate` | ISO 8601 event date |
| `organizerName` | Organizer or host name |
| `organizerEmail` | Email address (if publicly listed) |
| `organizerLinkedIn` | LinkedIn company or profile URL |
| `organizerWebsite` | External website URL |
| `organizerInstagram` | Instagram URL |
| `organizerTwitter` | Twitter/X URL |
| `source` | "luma" or "eventbrite" |
| `scrapedAt` | Scrape timestamp |

## Example Input — URL Mode

```json
{
  "eventUrls": [
    "https://lu.ma/ai-founders-dinner",
    "https://www.eventbrite.com/e/startup-summit-2026-tickets-123456789"
  ],
  "maxResults": 50
}
```

## Example Input — Search Mode

```json
{
  "query": "AI startup networking",
  "source": "luma",
  "city": "San Francisco",
  "maxResults": 30
}
```

## Example Output

```json
{
  "eventName": "AI Founders Dinner SF",
  "eventUrl": "https://lu.ma/ai-founders-dinner",
  "eventDate": "2026-05-20T19:00:00.000Z",
  "organizerName": "Sarah Chen",
  "organizerEmail": "sarah@aistartups.com",
  "organizerLinkedIn": "https://linkedin.com/company/ai-startups-sf",
  "organizerWebsite": "https://aistartups.com",
  "source": "luma",
  "scrapedAt": "2026-04-23T10:00:00.000Z"
}
```

## Questions answered by this actor

- Who organizes AI events in San Francisco and how do I contact them?
- What are the emails of startup conference organizers in London?
- Which companies run the most tech networking events in New York?
- How do I find LinkedIn profiles of hackathon organizers in my city?

## Data Extraction Methodology

- **Luma events**: Extracts from `__NEXT_DATA__` JSON embedded in the page (host profiles with LinkedIn, Instagram, Twitter handles, website URLs)
- **Eventbrite events**: Parses JSON-LD schema.org markup + scans page text for email addresses and social links
- **Email detection**: Regex scan of full page text — finds emails in descriptions, contact sections
- **LinkedIn detection**: Pattern matching for linkedin.com/company/ and linkedin.com/in/ URLs

## Frequently Asked Questions

**Is this legal?** This actor collects only publicly available information that organizers have voluntarily published on public event pages.

**How accurate are emails?** Emails are extracted from event descriptions and organizer profiles where they've been intentionally shared. Accuracy depends on how much info the organizer made public.

**Can I use this for cold email?** Always comply with CAN-SPAM, GDPR, and applicable regulations in your jurisdiction.

**What if an organizer has no contact info?** The actor returns the event and organizer name even if no email or LinkedIn is found — partial data is still useful for research.

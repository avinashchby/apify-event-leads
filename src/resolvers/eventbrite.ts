import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import type { OrganizerLead } from '../types';
import { extractEmails, extractLinkedIn, extractWebsite, extractInstagram, extractTwitter } from '../extractor';
import { parseDate } from '../utils/normalize';

interface EventbriteJsonLd {
  '@type'?: string;
  name?: string;
  startDate?: string;
  organizer?: { name?: string; url?: string; sameAs?: string | string[] };
  description?: string;
  url?: string;
}

const EXCLUDED_DOMAINS = ['eventbrite.com', 'google.com', 'apple.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'facebook.com'];

export async function resolveEventbriteEvent(url: string): Promise<OrganizerLead | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    const html = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText ?? '');
    const scrapedAt = new Date().toISOString();

    const $ = cheerio.load(html);
    const eventDataHolder: { data: EventbriteJsonLd | null } = { data: null };

    $('script[type="application/ld+json"]').each((_, el) => {
      if (eventDataHolder.data) return false;
      try {
        const raw = JSON.parse($(el).html() ?? '{}') as EventbriteJsonLd | EventbriteJsonLd[];
        const entries = Array.isArray(raw) ? raw : [raw];
        for (const entry of entries) {
          if (entry['@type'] === 'Event' && entry.name) {
            eventDataHolder.data = entry;
            break;
          }
        }
      } catch {
        // malformed
      }
    });

    const eventData = eventDataHolder.data;
    const emails = extractEmails(pageText);
    const allText = html + ' ' + pageText;
    const linkedIn = extractLinkedIn(allText);
    const instagram = extractInstagram(allText);
    const twitter = extractTwitter(allText);

    const sameAs = eventData?.organizer?.sameAs;
    const sameAsUrls = Array.isArray(sameAs) ? sameAs : sameAs ? [sameAs] : [];
    const website = extractWebsite(
      [...sameAsUrls, eventData?.organizer?.url ?? ''].filter(Boolean),
      EXCLUDED_DOMAINS
    );

    return {
      eventName: eventData?.name ?? 'Unknown Event',
      eventUrl: url,
      eventDate: eventData?.startDate ? parseDate(eventData.startDate) : undefined,
      organizerName: eventData?.organizer?.name,
      organizerWebsite: website,
      organizerLinkedIn: linkedIn,
      organizerEmail: emails[0],
      organizerInstagram: instagram,
      organizerTwitter: twitter,
      source: 'eventbrite',
      scrapedAt,
    };
  } catch (err) {
    console.error(`[eventbrite-resolver] failed for ${url}:`, err);
    return null;
  } finally {
    await browser.close();
  }
}

export async function discoverEventbriteUrls(query: string, city: string | undefined, limit: number): Promise<string[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const keyword = query.toLowerCase().replace(/\s+/g, '-');
    const place = city ? `us--${city.toLowerCase().replace(/\s+/g, '-')}` : 'online';
    const searchUrl = `https://www.eventbrite.com/d/${place}/${keyword}/`;

    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 45000 });
    const html = await page.content();

    const $ = cheerio.load(html);
    const urls: string[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      if (urls.length >= limit) return false;
      try {
        const raw = JSON.parse($(el).html() ?? '{}') as Record<string, unknown>;
        if (raw['@type'] === 'ItemList') {
          for (const item of (raw.itemListElement as Array<{ item?: { url?: string }; url?: string }>) ?? []) {
            const eventUrl = item.item?.url ?? item.url;
            if (eventUrl && !urls.includes(eventUrl)) urls.push(eventUrl);
          }
        }
      } catch {
        // malformed
      }
    });

    console.log(`[eventbrite-discover] found ${urls.length} event URLs`);
    return urls.slice(0, limit);
  } finally {
    await browser.close();
  }
}

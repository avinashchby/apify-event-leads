import { chromium } from 'playwright';
import type { OrganizerLead } from '../types';
import { extractEmails, extractLinkedIn, extractWebsite, extractInstagram, extractTwitter } from '../extractor';
import { parseDate } from '../utils/normalize';

interface LumaHost {
  name?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  linkedin_url?: string;
  bio?: string;
  website_url?: string;
}

interface LumaInitialData {
  event?: { name?: string; start_at?: string };
  hosts?: LumaHost[];
  organizer?: { name?: string; website?: string };
}

const EXCLUDED_DOMAINS = ['lu.ma', 'google.com', 'apple.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'facebook.com', 'luma.com'];

export async function resolveLumaEvent(url: string): Promise<OrganizerLead | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const nextData = await page.evaluate((): unknown => {
      const el = document.getElementById('__NEXT_DATA__');
      if (!el?.textContent) return null;
      try { return JSON.parse(el.textContent); } catch { return null; }
    });

    const pageText = await page.evaluate(() => document.body.innerText ?? '');
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href)
    );
    const scrapedAt = new Date().toISOString();

    const obj = nextData as Record<string, unknown> | null;
    const pageProps = (obj?.['props'] as Record<string, unknown>)?.['pageProps'] as Record<string, unknown> | undefined;
    const data = pageProps?.['initialData'] as LumaInitialData | undefined;

    const eventName = data?.event?.name ?? 'Unknown Event';
    const eventDate = data?.event?.start_at ? parseDate(data.event.start_at) : undefined;
    const hosts = data?.hosts ?? [];
    const primaryHost = hosts[0];

    const allText = pageText + ' ' + JSON.stringify(nextData ?? '');
    const emails = extractEmails(allText);

    const website = primaryHost?.website_url
      ?? extractWebsite(hrefs, EXCLUDED_DOMAINS)
      ?? undefined;

    const linkedIn = primaryHost?.linkedin_url ?? extractLinkedIn(allText);
    const instagram = primaryHost?.instagram_handle
      ? `https://instagram.com/${primaryHost.instagram_handle}`
      : extractInstagram(allText);
    const twitter = primaryHost?.twitter_handle
      ? `https://twitter.com/${primaryHost.twitter_handle}`
      : extractTwitter(allText);

    return {
      eventName,
      eventUrl: url,
      eventDate,
      organizerName: primaryHost?.name ?? data?.organizer?.name,
      organizerWebsite: website,
      organizerLinkedIn: linkedIn,
      organizerEmail: emails[0],
      organizerInstagram: instagram,
      organizerTwitter: twitter,
      source: 'luma',
      scrapedAt,
    };
  } catch (err) {
    console.error(`[luma-resolver] failed for ${url}:`, err);
    return null;
  } finally {
    await browser.close();
  }
}

export async function discoverLumaUrls(query: string, city: string | undefined, limit: number): Promise<string[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (city) params.set('location', city);

    let urls: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('/api/') || response.request().method() !== 'GET') return;
      try {
        const json = await response.json() as { entries?: { event?: { url?: string } }[] };
        if (json?.entries && urls.length === 0) {
          urls = (json.entries ?? [])
            .map(e => e.event?.url)
            .filter((u): u is string => !!u)
            .map(u => u.startsWith('http') ? u : `https://lu.ma/${u}`)
            .slice(0, limit);
          console.log(`[luma-discover] captured ${urls.length} event URLs from API`);
        }
      } catch {
        // not JSON
      }
    });

    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    await page.goto(`https://lu.ma/discover?${params.toString()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);

    if (urls.length === 0) {
      const nextData = await page.evaluate((): unknown => {
        const el = document.getElementById('__NEXT_DATA__');
        if (!el?.textContent) return null;
        try { return JSON.parse(el.textContent); } catch { return null; }
      });
      const obj = nextData as Record<string, unknown> | null;
      const pageProps = (obj?.['props'] as Record<string, unknown>)?.['pageProps'] as Record<string, unknown> | undefined;
      const initialData = pageProps?.['initialData'] as Record<string, unknown> | undefined;
      const featuredPlace = initialData?.['featured_place'] as Record<string, unknown> | undefined;
      const rawEntries = featuredPlace?.['events'] as Record<string, unknown>[] | undefined;
      if (Array.isArray(rawEntries)) {
        urls = rawEntries
          .map((e) => (e['event'] as { url?: string } | undefined)?.url)
          .filter((u): u is string => !!u)
          .map(u => u.startsWith('http') ? u : `https://lu.ma/${u}`)
          .slice(0, limit);
        console.log(`[luma-discover] __NEXT_DATA__ fallback: ${urls.length} URLs`);
      }
    }

    return urls;
  } finally {
    await browser.close();
  }
}

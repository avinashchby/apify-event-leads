import { Actor } from 'apify';
import type { InputSchema, OrganizerLead } from './types';
import { resolveLumaEvent, discoverLumaUrls } from './resolvers/luma';
import { resolveEventbriteEvent, discoverEventbriteUrls } from './resolvers/eventbrite';

async function main(): Promise<void> {
  await Actor.init();
  try {
    const rawInput = await Actor.getInput<Partial<InputSchema>>();
    const input: InputSchema = {
      eventUrls: rawInput?.eventUrls,
      query: rawInput?.query,
      source: rawInput?.source ?? 'luma',
      city: rawInput?.city,
      maxResults: rawInput?.maxResults ?? 50,
    };

    console.log(`[event-leads] mode=${input.eventUrls?.length ? 'url' : 'search'} maxResults=${input.maxResults}`);

    let urlsToProcess: Array<{ url: string; source: 'luma' | 'eventbrite' | 'other' }> = [];

    if (input.eventUrls && input.eventUrls.length > 0) {
      urlsToProcess = input.eventUrls.slice(0, input.maxResults).map(url => ({
        url,
        source: url.includes('lu.ma') ? 'luma' : url.includes('eventbrite.com') ? 'eventbrite' : 'other',
      }));
    } else if (input.query) {
      const query = input.query;
      const city = input.city;
      const limit = input.maxResults;

      if (input.source === 'luma' || input.source === 'both') {
        const lumaUrls = await discoverLumaUrls(query, city, input.source === 'both' ? Math.ceil(limit / 2) : limit);
        urlsToProcess.push(...lumaUrls.map(url => ({ url, source: 'luma' as const })));
      }
      if (input.source === 'eventbrite' || input.source === 'both') {
        const remaining = limit - urlsToProcess.length;
        const ebUrls = await discoverEventbriteUrls(query, city, remaining > 0 ? remaining : limit);
        urlsToProcess.push(...ebUrls.map(url => ({ url, source: 'eventbrite' as const })));
      }
    }

    console.log(`[event-leads] Processing ${urlsToProcess.length} event URLs`);

    const leads: OrganizerLead[] = [];

    // Sequential to avoid OOM — each Playwright browser uses ~200MB
    for (const { url, source } of urlsToProcess) {
      if (leads.length >= input.maxResults) break;
      console.log(`[event-leads] Resolving ${source} event: ${url}`);
      let lead: OrganizerLead | null = null;
      try {
        if (source === 'luma') {
          lead = await resolveLumaEvent(url);
        } else if (source === 'eventbrite') {
          lead = await resolveEventbriteEvent(url);
        }
      } catch (err) {
        console.error(`[event-leads] Failed to resolve ${url}:`, err);
      }
      if (lead) leads.push(lead);
    }

    console.log(`[event-leads] Done. Extracted ${leads.length} leads.`);
    if (leads.length === 0) {
      console.warn('[event-leads] No leads extracted. Check input URLs or search query.');
    }

    const dataset = await Actor.openDataset();
    await dataset.pushData(leads);

    await Actor.exit();
  } catch (err) {
    console.error('[event-leads] Fatal error:', err);
    await Actor.exit({ exitCode: 1 });
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

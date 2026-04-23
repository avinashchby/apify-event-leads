export function extractEmails(text: string): string[] {
  const matches = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [];
  return [...new Set(matches)].filter(e =>
    !e.includes('example.com') && !e.includes('test.com') && !e.includes('sentry.io')
  );
}

export function extractLinkedIn(text: string): string | undefined {
  const m = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[\w-]+\/?/i);
  return m?.[0];
}

export function extractWebsite(urls: string[], excludeDomains: string[]): string | undefined {
  for (const url of urls) {
    if (!url) continue;
    try {
      const hostname = new URL(url).hostname;
      if (excludeDomains.some(d => hostname.includes(d))) continue;
      return url;
    } catch {
      // invalid URL
    }
  }
  return undefined;
}

export function extractInstagram(text: string): string | undefined {
  const m = text.match(/https?:\/\/(?:www\.)?instagram\.com\/[\w.]+\/?/i);
  return m?.[0];
}

export function extractTwitter(text: string): string | undefined {
  const m = text.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/?/i);
  return m?.[0];
}

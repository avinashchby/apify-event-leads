export function parseDate(raw: string | number): string {
  if (typeof raw === 'number') {
    const ms = raw > 1e10 ? raw : raw * 1000;
    return new Date(ms).toISOString();
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildLocation(city?: string, country?: string): string {
  return [city, country].filter(Boolean).join(', ');
}

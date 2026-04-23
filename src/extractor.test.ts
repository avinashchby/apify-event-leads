import { describe, it, expect } from 'vitest';
import { extractEmails, extractLinkedIn, extractInstagram, extractTwitter } from './extractor';

describe('extractEmails', () => {
  it('finds email in text', () => {
    const emails = extractEmails('Contact us at hello@example.org for more info');
    // example.org is not filtered out (only example.com and test.com are)
    expect(emails).toContain('hello@example.org');
  });

  it('returns empty for no emails', () => {
    expect(extractEmails('No emails here')).toHaveLength(0);
  });

  it('deduplicates emails', () => {
    const emails = extractEmails('info@company.com info@company.com');
    expect(emails).toHaveLength(1);
  });
});

describe('extractLinkedIn', () => {
  it('finds company URL', () => {
    const url = extractLinkedIn('Visit us at https://linkedin.com/company/mycompany for more');
    expect(url).toBe('https://linkedin.com/company/mycompany');
  });

  it('finds profile URL', () => {
    const url = extractLinkedIn('https://www.linkedin.com/in/johndoe');
    expect(url).toBe('https://www.linkedin.com/in/johndoe');
  });

  it('returns undefined for no LinkedIn', () => {
    expect(extractLinkedIn('no social links here')).toBeUndefined();
  });
});

describe('extractInstagram', () => {
  it('finds Instagram URL', () => {
    const url = extractInstagram('Follow us: https://instagram.com/mybrand');
    expect(url).toBe('https://instagram.com/mybrand');
  });
});

describe('extractTwitter', () => {
  it('finds Twitter URL', () => {
    const url = extractTwitter('Tweet us at https://twitter.com/myhandle please');
    expect(url).toBe('https://twitter.com/myhandle');
  });

  it('finds X.com URL', () => {
    const url = extractTwitter('https://x.com/myhandle');
    expect(url).toBe('https://x.com/myhandle');
  });
});

import { describe, expect, it } from 'vitest';

import { profile } from '@/content/profile';
import {
  buildOwnerEmail,
  buildRequesterEmail,
  displayCompany,
  displayReferrer,
  escapeHtml,
  formatManilaTimestamp,
  stripHeaderInjection,
  type ContactSubmission,
} from '@/lib/contact-email';

const SUBMISSION: ContactSubmission = {
  name: 'Jane Recruiter',
  email: 'jane@example.com',
  company: 'Acme Corp',
  message: 'We have a senior React role that fits your background.',
  requestResume: true,
  referrer: 'https://www.linkedin.com/in/romualdo-dasig-55937723',
  // 14:30 UTC → 22:30 in Manila. Chosen so a timezone bug shows as a wrong hour
  // rather than a wrong minute.
  submittedAt: new Date('2026-08-26T14:30:00.000Z'),
};

const submission = (overrides: Partial<ContactSubmission> = {}) => ({
  ...SUBMISSION,
  ...overrides,
});

describe('escapeHtml', () => {
  it.each([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&#39;'],
  ])('escapes %s', (input, expected) => {
    expect(escapeHtml(input)).toBe(expected);
  });

  it('escapes the ampersand first, so nothing is double-encoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('defuses a script tag', () => {
    expect(escapeHtml('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeHtml('Acme Corp — Cebu')).toBe('Acme Corp — Cebu');
  });
});

describe('stripHeaderInjection', () => {
  it.each([
    ['Jane\r\nBcc: victim@example.com', 'Jane Bcc: victim@example.com'],
    ['Jane\nX-Header: x', 'Jane X-Header: x'],
    ['Jane\rRecruiter', 'Jane Recruiter'],
    ['Jane\0Recruiter', 'Jane Recruiter'],
  ])('flattens %j', (input, expected) => {
    expect(stripHeaderInjection(input)).toBe(expected);
  });

  it('leaves no CR or LF behind at all', () => {
    expect(stripHeaderInjection('a\r\n\r\nb')).not.toMatch(/[\r\n]/);
  });

  it('collapses the gap a stripped newline leaves', () => {
    expect(stripHeaderInjection('Jane \n Recruiter')).toBe('Jane Recruiter');
  });

  it('trims the edges', () => {
    expect(stripHeaderInjection('\n Jane \n')).toBe('Jane');
  });
});

describe('formatManilaTimestamp', () => {
  it('renders in Asia/Manila, not the runtime timezone', () => {
    // 14:30Z is 22:30 in Manila on the same day.
    expect(formatManilaTimestamp(new Date('2026-08-26T14:30:00.000Z'))).toBe(
      '26 Aug 2026, 22:30 (Asia/Manila, UTC+8)',
    );
  });

  it('rolls the date forward when UTC+8 crosses midnight', () => {
    // 17:00Z on the 26th is 01:00 on the 27th in Manila. A naive UTC render would
    // date this lead a day early.
    expect(formatManilaTimestamp(new Date('2026-08-26T17:00:00.000Z'))).toBe(
      '27 Aug 2026, 01:00 (Asia/Manila, UTC+8)',
    );
  });

  it('uses a 24-hour clock, so midnight is 00 rather than 12', () => {
    expect(formatManilaTimestamp(new Date('2026-08-26T16:00:00.000Z'))).toContain(
      '00:00',
    );
  });

  it('degrades to a readable string on an invalid date rather than throwing', () => {
    expect(formatManilaTimestamp(new Date('nonsense'))).toBe('unknown time');
  });
});

describe('displayCompany / displayReferrer', () => {
  it.each([undefined, '', '   '])('substitutes for company %j', (company) => {
    expect(displayCompany(company)).toBe('no company given');
  });

  it('passes a real company through', () => {
    expect(displayCompany('Acme Corp')).toBe('Acme Corp');
  });

  it.each([null, '', '  '])('substitutes for referrer %j', (referrer) => {
    expect(displayReferrer(referrer)).toBe('direct — no referrer sent');
  });
});

describe('buildRequesterEmail — Email A', () => {
  const email = buildRequesterEmail({ name: 'Jane Recruiter' });

  it('uses the FR-7 subject', () => {
    expect(email.subject).toBe(`${profile.name} — ${profile.title} Resume`);
  });

  it('greets by name', () => {
    expect(email.text).toContain('Hi Jane Recruiter,');
    expect(email.html).toContain('Hi Jane Recruiter,');
  });

  it('carries the portfolio, LinkedIn and GitHub links (FR-7)', () => {
    for (const body of [email.text, email.html]) {
      expect(body).toContain(profile.url);
      expect(body).toContain('linkedin.com');
      expect(body).toContain('github.com');
    }
  });

  it('NEVER echoes the submitted message', () => {
    // The regression this guards is someone "helpfully" adding a confirmation
    // quote of what the recruiter wrote. §8: reflected content vector.
    const withMessage = buildRequesterEmail({ name: 'Jane' });

    expect(withMessage.text).not.toContain(SUBMISSION.message);
    expect(withMessage.html).not.toContain(SUBMISSION.message);
  });

  it('escapes the name in the HTML body', () => {
    const hostile = buildRequesterEmail({ name: '<img src=x onerror=alert(1)>' });

    expect(hostile.html).not.toContain('<img');
    expect(hostile.html).toContain('&lt;img');
  });

  it('strips header injection from the name before it reaches the greeting', () => {
    const hostile = buildRequesterEmail({ name: 'Jane\r\nBcc: victim@example.com' });

    expect(hostile.text).not.toMatch(/[\r\n]Bcc:/);
  });

  it('offers both a text and an HTML part', () => {
    expect(email.text.length).toBeGreaterThan(0);
    expect(email.html.length).toBeGreaterThan(0);
  });
});

describe('buildOwnerEmail — Email B', () => {
  const email = buildOwnerEmail(submission());

  it('uses the FR-7 subject with name and company', () => {
    expect(email.subject).toBe('New portfolio inquiry from Jane Recruiter (Acme Corp)');
  });

  it('names the missing company in the subject rather than leaving "()"', () => {
    expect(buildOwnerEmail(submission({ company: '' })).subject).toBe(
      'New portfolio inquiry from Jane Recruiter (no company given)',
    );
  });

  it('sets Reply-To to the submitter, which is the whole point of G-5', () => {
    expect(email.replyTo).toBe('jane@example.com');
  });

  it('strips header injection out of Reply-To', () => {
    const hostile = buildOwnerEmail(
      submission({ email: 'jane@example.com\r\nBcc: victim@example.com' }),
    );

    expect(hostile.replyTo).not.toMatch(/[\r\n]/);
  });

  it('strips header injection out of the subject', () => {
    const hostile = buildOwnerEmail(submission({ name: 'Jane\r\nSubject: Hijacked' }));

    expect(hostile.subject).not.toMatch(/[\r\n]/);
  });

  it('carries every field FR-7 asks for', () => {
    for (const body of [email.text, email.html]) {
      expect(body).toContain('Jane Recruiter');
      expect(body).toContain('jane@example.com');
      expect(body).toContain('Acme Corp');
      expect(body).toContain(SUBMISSION.message);
      expect(body).toContain('26 Aug 2026, 22:30');
      expect(body).toContain('linkedin.com');
    }
  });

  it('says whether the resume actually went out', () => {
    expect(buildOwnerEmail(submission({ requestResume: true })).text).toContain(
      'Resume requested: Yes',
    );
    expect(buildOwnerEmail(submission({ requestResume: false })).text).toContain(
      'Resume requested: No',
    );
  });

  it('escapes the message in the HTML body', () => {
    const hostile = buildOwnerEmail(
      submission({ message: '<script>fetch("//evil")</script>' }),
    );

    expect(hostile.html).not.toContain('<script>');
    expect(hostile.html).toContain('&lt;script&gt;');
  });

  it('escapes a hostile company name too — every field, not just the obvious one', () => {
    const hostile = buildOwnerEmail(submission({ company: '"><script>x</script>' }));

    expect(hostile.html).not.toContain('<script>');
  });

  it('keeps the plain-text part unescaped — it is not HTML', () => {
    const angled = buildOwnerEmail(submission({ message: 'a < b' }));

    expect(angled.text).toContain('a < b');
  });
});

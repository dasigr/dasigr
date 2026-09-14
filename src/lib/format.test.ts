import { describe, expect, it } from 'vitest';

import {
  formatUrlLabel,
  formatVerified,
  formatVerifiedWindow,
  joinNames,
} from '@/lib/format';

describe('formatUrlLabel', () => {
  it('strips the protocol and a leading www', () => {
    expect(formatUrlLabel('https://www.cebufest.com')).toBe('cebufest.com');
    expect(formatUrlLabel('http://www.moalboalbeachresorts.com')).toBe(
      'moalboalbeachresorts.com',
    );
  });

  it('keeps a subdomain that is not www', () => {
    expect(formatUrlLabel('https://api.accuglassproducts.com')).toBe(
      'api.accuglassproducts.com',
    );
  });

  it('drops a trailing slash but keeps a real path', () => {
    expect(formatUrlLabel('https://www.duniway.com/')).toBe('duniway.com');
    expect(formatUrlLabel('https://github.com/dasigr')).toBe('github.com/dasigr');
  });

  it('returns unparseable input unchanged, so a bad entry is visible', () => {
    expect(formatUrlLabel('not a url')).toBe('not a url');
    expect(formatUrlLabel('')).toBe('');
  });
});

describe('formatVerified', () => {
  it('keeps the exact month — the precision is the point', () => {
    expect(formatVerified('2026-08')).toBe('Verified 2026-08');
  });
});

describe('formatVerifiedWindow', () => {
  it('names one month when every check happened in it', () => {
    expect(formatVerifiedWindow(['2026-08', '2026-08'])).toBe('August 2026');
  });

  it('spans the range once a check lands in another month', () => {
    // The case that made this function exist: the lede said "August 2026" and
    // Sugbo Rentals was verified in September.
    expect(formatVerifiedWindow(['2026-08', '2026-09', '2026-08'])).toBe(
      'August–September 2026',
    );
  });

  it('repeats the year when the span crosses one', () => {
    expect(formatVerifiedWindow(['2027-01', '2026-08'])).toBe(
      'August 2026–January 2027',
    );
  });

  it('sorts by date rather than by input order', () => {
    expect(formatVerifiedWindow(['2026-12', '2026-02'])).toBe(
      'February–December 2026',
    );
  });

  it('ignores entries that are not YYYY-MM', () => {
    expect(formatVerifiedWindow(['2026-08', '', 'soon', '2026-13'])).toBe(
      'August 2026',
    );
  });

  it('returns empty so the caller can drop the claim, not print a blank date', () => {
    expect(formatVerifiedWindow([])).toBe('');
    expect(formatVerifiedWindow(['never'])).toBe('');
  });
});

describe('joinNames', () => {
  it('joins with a middot and handles the edges', () => {
    expect(joinNames(['Seiwa Optical America', 'Arctic Zero'])).toBe(
      'Seiwa Optical America · Arctic Zero',
    );
    expect(joinNames(['Pro-Physik'])).toBe('Pro-Physik');
    expect(joinNames([])).toBe('');
  });
});

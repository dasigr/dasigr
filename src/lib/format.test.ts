import { describe, expect, it } from 'vitest';

import { formatUrlLabel, formatVerified, joinNames } from '@/lib/format';

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

describe('joinNames', () => {
  it('joins with a middot and handles the edges', () => {
    expect(joinNames(['Seiwa Optical America', 'Arctic Zero'])).toBe(
      'Seiwa Optical America · Arctic Zero',
    );
    expect(joinNames(['Pro-Physik'])).toBe('Pro-Physik');
    expect(joinNames([])).toBe('');
  });
});

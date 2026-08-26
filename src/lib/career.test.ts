import { describe, expect, it } from 'vitest';

import {
  careerBusLabel,
  careerHeadline,
  careerLengthMonths,
  careerSegments,
  elapsedMonths,
  engagementMonths,
  experiencePhrase,
  findCareerGaps,
  formatDuration,
  formatMonth,
  formatRange,
  fromMonthIndex,
  monthIndex,
  summariseCareer,
  toYearMonth,
} from '@/lib/career';
import { engagements, type Engagement } from '@/content/experience';

/** The month the resume was reconciled against. Fixed, so nothing here drifts. */
const AS_OF = '2026-08';

const entry = (
  start: string,
  end: string | null,
  overrides: Partial<Engagement> = {},
): Engagement => ({
  company: 'Test Co',
  role: 'Software Engineer',
  location: 'Cebu',
  start,
  end,
  kind: 'employed',
  ...overrides,
});

describe('monthIndex', () => {
  it('orders months across a year boundary', () => {
    expect(monthIndex('2009-01')).toBe(monthIndex('2008-12') + 1);
  });

  it('rejects a malformed value instead of returning NaN', () => {
    expect(() => monthIndex('2008-13')).toThrow(/YYYY-MM/);
    expect(() => monthIndex('2008')).toThrow(/YYYY-MM/);
    expect(() => monthIndex('')).toThrow(/YYYY-MM/);
  });

  it('round-trips through fromMonthIndex', () => {
    expect(fromMonthIndex(monthIndex('2019-07'))).toBe('2019-07');
    expect(fromMonthIndex(monthIndex('2026-12'))).toBe('2026-12');
  });
});

describe('toYearMonth', () => {
  it('zero-pads single-digit months', () => {
    expect(toYearMonth(new Date(2026, 0, 15))).toBe('2026-01');
    expect(toYearMonth(new Date(2026, 10, 1))).toBe('2026-11');
  });
});

describe('formatMonth and formatRange', () => {
  it('formats a month as "Nov 2008"', () => {
    expect(formatMonth('2008-11')).toBe('Nov 2008');
  });

  it('renders an open-ended range as Present', () => {
    expect(formatRange('2026-06', null)).toBe('Jun 2026 – Present');
    expect(formatRange('2008-11', '2011-07')).toBe('Nov 2008 – Jul 2011');
  });
});

describe('durations', () => {
  it('counts both endpoint months for an engagement', () => {
    // Aug 2011 to Dec 2011 is five months, not four.
    expect(engagementMonths(entry('2011-08', '2011-12'), AS_OF)).toBe(5);
  });

  it('measures an ongoing engagement to asOf', () => {
    expect(engagementMonths(entry('2026-06', null), AS_OF)).toBe(3);
  });

  it('measures career length to the START of the current month', () => {
    // Nov 2008 → Aug 2026 must read as 17 years 9 months, per §6.3. The month in
    // progress is not claimed as complete.
    expect(careerLengthMonths('2008-11', AS_OF)).toBe(213);
    expect(formatDuration(213)).toBe('17 years 9 months');
  });

  it('never reports a negative span', () => {
    expect(careerLengthMonths('2027-01', AS_OF)).toBe(0);
  });

  it('formats singulars and drops empty components', () => {
    expect(formatDuration(12)).toBe('1 year');
    expect(formatDuration(13)).toBe('1 year 1 month');
    expect(formatDuration(5)).toBe('5 months');
    expect(formatDuration(0)).toBe('0 months');
  });

  it('elapsedMonths is exclusive of the end month', () => {
    expect(elapsedMonths('2020-01', '2020-01')).toBe(0);
    expect(elapsedMonths('2020-01', '2021-01')).toBe(12);
  });
});

describe('experiencePhrase', () => {
  it('rounds down, so the claim is never ahead of the facts', () => {
    expect(experiencePhrase(213)).toBe('17+ years');
    expect(experiencePhrase(215)).toBe('17+ years');
    expect(experiencePhrase(216)).toBe('18+ years');
  });
});

describe('careerSegments', () => {
  it('runs oldest first, the direction the bar is read in', () => {
    const segments = careerSegments(engagements, AS_OF);
    expect(segments[0].start).toBe('2008-11');
    expect(segments.at(-1)?.end).toBeNull();
  });

  it('marks the open-ended engagement current, whatever its kind', () => {
    const segments = careerSegments(
      [entry('2020-01', null, { kind: 'employed' })],
      AS_OF,
    );
    expect(segments[0].kind).toBe('current');
  });

  it('gives every segment a unique key', () => {
    const segments = careerSegments(engagements, AS_OF);
    expect(new Set(segments.map((s) => s.key)).size).toBe(segments.length);
  });
});

describe('findCareerGaps', () => {
  it('finds no gap in the real history — the "no gaps" claim is checked, not asserted', () => {
    expect(findCareerGaps(engagements, AS_OF)).toEqual([]);
  });

  it('treats consecutive months as continuous', () => {
    expect(
      findCareerGaps([entry('2020-01', '2020-06'), entry('2020-07', null)], AS_OF),
    ).toEqual([]);
  });

  it('reports the uncovered months when one exists', () => {
    expect(
      findCareerGaps([entry('2020-01', '2020-06'), entry('2020-09', null)], AS_OF),
    ).toEqual([{ from: '2020-07', to: '2020-08', months: 2 }]);
  });

  it('does not treat an overlap as a gap', () => {
    // Freelancing from Nov 2008 alongside the Teradyne role is the real case.
    expect(
      findCareerGaps(
        [
          entry('2008-11', '2011-07'),
          entry('2009-01', '2010-10'),
          entry('2011-08', null),
        ],
        AS_OF,
      ),
    ).toEqual([]);
  });

  it('does not let a short nested engagement hide a later gap', () => {
    expect(
      findCareerGaps(
        [entry('2020-01', '2020-12'), entry('2020-03', '2020-05'), entry('2021-04', null)],
        AS_OF,
      ),
    ).toEqual([{ from: '2021-01', to: '2021-03', months: 3 }]);
  });
});

describe('careerHeadline', () => {
  it('claims no gaps only when there are none', () => {
    expect(careerHeadline(engagements, AS_OF)).toBe(
      'Continuous since Nov 2008 — 12 engagements, no gaps',
    );
  });

  it('drops the claim as soon as the data breaks continuity', () => {
    const broken = [entry('2020-01', '2020-06'), entry('2021-01', null)];
    expect(careerHeadline(broken, AS_OF)).toBe(
      'Continuous since Jan 2020 — 2 engagements',
    );
  });
});

describe('careerBusLabel', () => {
  it('names every engagement, so the bar is not information a screen reader loses', () => {
    const segments = careerSegments(engagements, AS_OF);
    const label = careerBusLabel(segments);

    expect(label).toContain('from Nov 2008 to the present');
    for (const engagement of engagements) {
      expect(label).toContain(engagement.company);
    }
  });

  it('drops the no-gaps wording when continuity is broken', () => {
    const segments = careerSegments([entry('2020-01', '2020-06')], AS_OF);
    expect(careerBusLabel(segments, { continuous: false })).not.toContain(
      'no gaps',
    );
  });
});

describe('summariseCareer', () => {
  it('agrees with §6.3 on the real data', () => {
    const summary = summariseCareer(AS_OF);

    expect(summary.phrase).toBe('17+ years');
    expect(summary.exact).toBe('17 years 9 months');
    expect(summary.segments).toHaveLength(12);
    expect(summary.busLabel).toContain('no gaps');
  });

  it('handles an empty history without throwing', () => {
    const summary = summariseCareer(AS_OF, []);

    expect(summary.totalMonths).toBe(0);
    expect(summary.segments).toEqual([]);
    expect(summary.busLabel).toBe('No career timeline available');
  });
});

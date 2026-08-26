/**
 * src/lib/career.ts
 *
 * Date maths for the employment history. Everything here is pure and takes the
 * "now" it should reason about as an argument — no ambient clock, so the output is
 * the same in a test, in a build, and in a different timezone.
 *
 * Months are handled as "YYYY-MM" strings and converted to an absolute month index.
 * Day-of-month is deliberately absent: the resume records months, and pretending to
 * day precision would invent information.
 */

import { engagements, type Engagement } from '@/content/experience';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "YYYY-MM" → absolute month index. Throws rather than silently producing NaN. */
export function monthIndex(yearMonth: string): number {
  const match = YEAR_MONTH.exec(yearMonth);
  if (!match) {
    throw new Error(`Expected a "YYYY-MM" value, received "${yearMonth}"`);
  }
  return Number(match[1]) * 12 + (Number(match[2]) - 1);
}

/** Absolute month index → "YYYY-MM". The inverse of {@link monthIndex}. */
export function fromMonthIndex(index: number): string {
  const year = Math.floor(index / 12);
  const month = String((index % 12) + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** A Date → "YYYY-MM", in the caller's local time. The one clock-facing helper. */
export function toYearMonth(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

/** "2008-11" → "Nov 2008". */
export function formatMonth(yearMonth: string): string {
  const match = YEAR_MONTH.exec(yearMonth);
  if (!match) {
    throw new Error(`Expected a "YYYY-MM" value, received "${yearMonth}"`);
  }
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

/** "Nov 2008 – Jul 2011", or "Jun 2026 – Present" while ongoing. */
export function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`;
}

/** Whole months from one month to another. Exclusive of the end month. */
export function elapsedMonths(from: string, to: string): number {
  return monthIndex(to) - monthIndex(from);
}

/**
 * Length of an engagement in months, counting both the first and last month —
 * Aug 2011 to Dec 2011 is five months, not four. An ongoing engagement is measured
 * to `asOf`.
 */
export function engagementMonths(engagement: Engagement, asOf: string): number {
  return elapsedMonths(engagement.start, engagement.end ?? asOf) + 1;
}

/**
 * Career length. Measured to the START of `asOf`, which is what makes Nov 2008 →
 * Aug 2026 read as 17 years 9 months rather than 10 — the current month is in
 * progress and is not claimed as complete.
 */
export function careerLengthMonths(start: string, asOf: string): number {
  return Math.max(0, elapsedMonths(start, asOf));
}

/** 213 → "17 years 9 months". Singularises, and drops a zero component. */
export function formatDuration(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' ') : '0 months';
}

/**
 * The phrase used in copy. §6.3 standardises on "17+ years" — never "~18", never
 * "more than 15" — so this rounds DOWN and is the only place the form is decided.
 */
export function experiencePhrase(totalMonths: number): string {
  return `${Math.floor(totalMonths / 12)}+ years`;
}

/* ------------------------------------------------------------------ */
/* The career bus                                                      */
/* ------------------------------------------------------------------ */

export type SegmentKind = 'employed' | 'independent' | 'current';

export interface CareerSegment {
  key: string;
  /** "Zyrous Pty Ltd." — used to build the text alternative. */
  company: string;
  kind: SegmentKind;
  start: string;
  end: string | null;
  months: number;
}

/** Chronological, oldest first — the direction the bar is read in. */
export function careerSegments(
  entries: Engagement[],
  asOf: string,
): CareerSegment[] {
  return [...entries]
    .sort((a, b) => monthIndex(a.start) - monthIndex(b.start))
    .map((entry, index) => ({
      key: `${entry.company}-${entry.start}-${index}`,
      company: entry.company,
      kind: entry.end === null ? 'current' : entry.kind,
      start: entry.start,
      end: entry.end,
      months: engagementMonths(entry, asOf),
    }));
}

export interface CareerGap {
  /** First uncovered month, "YYYY-MM". */
  from: string;
  /** Last uncovered month, "YYYY-MM". */
  to: string;
  months: number;
}

/**
 * Months where nothing was running. The "no gaps" claim in the hero is the strongest
 * single fact on the resume, so it is checked against the data rather than asserted —
 * add an entry that breaks continuity and the claim disappears on its own.
 *
 * Overlaps (freelancing alongside Teradyne, say) are not gaps and are ignored.
 */
export function findCareerGaps(entries: Engagement[], asOf: string): CareerGap[] {
  const sorted = [...entries].sort(
    (a, b) => monthIndex(a.start) - monthIndex(b.start),
  );
  const gaps: CareerGap[] = [];
  let covered: number | null = null;

  for (const entry of sorted) {
    const start = monthIndex(entry.start);
    if (covered !== null && start > covered + 1) {
      gaps.push({
        from: fromMonthIndex(covered + 1),
        to: fromMonthIndex(start - 1),
        months: start - covered - 1,
      });
    }
    covered = Math.max(covered ?? -Infinity, monthIndex(entry.end ?? asOf));
  }

  return gaps;
}

/** "Continuous since Nov 2008 — 12 engagements, no gaps". */
export function careerHeadline(entries: Engagement[], asOf: string): string {
  const sorted = [...entries].sort(
    (a, b) => monthIndex(a.start) - monthIndex(b.start),
  );
  const first = sorted[0];
  if (!first) return 'No engagements recorded';

  const count = `${sorted.length} engagement${sorted.length === 1 ? '' : 's'}`;
  const gaps = findCareerGaps(entries, asOf);
  const continuity = gaps.length === 0 ? ', no gaps' : '';

  return `Continuous since ${formatMonth(first.start)} — ${count}${continuity}`;
}

/**
 * The text alternative for the bar (FR-1). A screen reader gets the same information
 * a sighted reader gets from the shape: every engagement, in order, with its dates.
 */
export function careerBusLabel(
  segments: CareerSegment[],
  options: { continuous?: boolean } = {},
): string {
  if (segments.length === 0) return 'No career timeline available';

  const first = segments[0];
  const last = segments[segments.length - 1];
  const span = `${formatMonth(first.start)} to ${
    last.end ? formatMonth(last.end) : 'the present'
  }`;

  const list = segments
    .map(
      (s) =>
        `${s.company} ${formatMonth(s.start)} to ${
          s.end ? formatMonth(s.end) : 'the present'
        }`,
    )
    .join('; ');

  const continuity =
    options.continuous === false
      ? `${segments.length} engagements`
      : `${segments.length} consecutive engagements with no gaps`;

  return `Career timeline from ${span}, showing ${continuity}: ${list}.`;
}

/* ------------------------------------------------------------------ */
/* Bound to the real content, for components that just want the answer */
/* ------------------------------------------------------------------ */

export interface CareerSummary {
  asOf: string;
  totalMonths: number;
  /** "17+ years" — for copy. */
  phrase: string;
  /** "17 years 9 months" — for the precise note beside the bar. */
  exact: string;
  headline: string;
  segments: CareerSegment[];
  busLabel: string;
}

export function summariseCareer(
  asOf: string,
  entries: Engagement[] = engagements,
): CareerSummary {
  const sorted = [...entries].sort(
    (a, b) => monthIndex(a.start) - monthIndex(b.start),
  );
  const start = sorted[0]?.start ?? asOf;
  const totalMonths = careerLengthMonths(start, asOf);
  const segments = careerSegments(entries, asOf);
  const continuous = findCareerGaps(entries, asOf).length === 0;

  return {
    asOf,
    totalMonths,
    phrase: experiencePhrase(totalMonths),
    exact: formatDuration(totalMonths),
    headline: careerHeadline(entries, asOf),
    segments,
    busLabel: careerBusLabel(segments, { continuous }),
  };
}

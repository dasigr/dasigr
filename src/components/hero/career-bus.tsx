/**
 * The career bus (FR-1, optional): one horizontal bar showing every engagement in
 * order, employment vs independent, so the strongest fact on the resume — no gaps
 * since 2008 — is visible in a glance instead of a scroll through fifteen entries.
 *
 * Segment widths are `flex-grow` values taken from each engagement's length in
 * months, so the bar is derived from the same data the timeline renders. Nothing
 * here is hand-tuned; add an engagement and the bar redraws.
 *
 * The bar is decorative markup, so it carries role="img" and a generated label that
 * lists every engagement with its dates (see careerBusLabel in src/lib/career.ts).
 */

import type { CareerSummary } from '@/lib/career';

const SEGMENT_STYLES: Record<string, string> = {
  employed: 'bg-linear-to-b from-accent-dark to-[#1f8a7d]',
  independent:
    'border border-[#3d5c6e] bg-[repeating-linear-gradient(135deg,#34506180,#34506180_4px,#2a424f80_4px,#2a424f80_8px)]',
  current: 'bg-linear-to-b from-amber to-amber-dark',
};

interface CareerBusProps {
  career: CareerSummary;
}

export function CareerBus({ career }: CareerBusProps) {
  // Evenly spaced labels, as in the mockup — the axis is an orientation aid, not a
  // scale, which is why it is aria-hidden and the real detail lives in the label.
  const startYear = Number(career.segments[0]?.start.slice(0, 4) ?? 0);
  const endYear = Number(career.asOf.slice(0, 4));
  const axisYears: string[] = [];
  for (let year = startYear; year < endYear; year += 4) {
    axisYears.push(String(year));
  }
  axisYears.push('Now');

  return (
    <div className="mt-14">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs tracking-widest uppercase text-dim">
          {career.headline}
        </p>
        <p className="text-sm text-dimmer">{career.exact}</p>
      </div>

      <div
        role="img"
        aria-label={career.busLabel}
        className="flex h-8.5 gap-0.5 overflow-hidden rounded-lg border border-line bg-bg-alt p-0.75"
      >
        {career.segments.map((segment) => (
          <div
            key={segment.key}
            style={{ flexGrow: segment.months }}
            className={`min-w-0.75 rounded-sm ${SEGMENT_STYLES[segment.kind]}`}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="mt-2 flex justify-between font-mono text-[0.7rem] text-dimmer"
      >
        {axisYears.map((year) => (
          <span key={year}>{year}</span>
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-4.5 text-sm text-dim">
        <li className="inline-flex items-center gap-1.75">
          <span
            aria-hidden="true"
            className={`inline-block size-3 rounded-xs bg-bg-alt ${SEGMENT_STYLES.employed}`}
          />
          Employed
        </li>
        <li className="inline-flex items-center gap-1.75">
          <span
            aria-hidden="true"
            className={`inline-block size-3 rounded-xs bg-bg-alt ${SEGMENT_STYLES.independent}`}
          />
          Independent / Freelance
        </li>
        <li className="inline-flex items-center gap-1.75">
          <span
            aria-hidden="true"
            className={`inline-block size-3 rounded-xs bg-bg-alt ${SEGMENT_STYLES.current}`}
          />
          Current
        </li>
      </ul>
    </div>
  );
}

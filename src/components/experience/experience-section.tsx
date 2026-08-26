/**
 * FR-4 and FR-4b. Server Component.
 *
 * ONE reverse-chronological sequence. Freelance periods are bounded and sit inline;
 * there is no parallel lane, because there was never a parallel career (§6.4).
 *
 * Several entries carry no bullets. That is deliberate — the prototype's placeholder
 * text was removed rather than shipped, and an entry with dates and a stack still
 * says everything it can honestly say.
 *
 * The earlier electronics roles collapse into a native <details>, which needs no JS
 * and keeps this whole section a Server Component.
 */

import { SectionHeading } from '@/components/ui/section-heading';
import { TagList } from '@/components/ui/tag-list';
import {
  earlierCareer,
  earlierCareerSummary,
  education,
  engagements,
} from '@/content/experience';
import { formatRange } from '@/lib/career';

interface ExperienceSectionProps {
  eyebrow: string;
}

export function ExperienceSection({ eyebrow }: ExperienceSectionProps) {
  return (
    <section
      id="experience"
      className="border-t border-line-soft py-16 lg:py-22"
      aria-labelledby="experience-heading"
    >
      <div className="mx-auto w-full max-w-page px-5">
        <SectionHeading
          headingId="experience-heading"
          eyebrow={eyebrow}
          title="Work history"
          lede="One reverse-chronological sequence. Freelance periods are bounded and sit inline — there is no parallel track, because there was never a parallel career."
        />

        <ol className="relative list-none pl-7 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-0.5 before:bg-line">
          {engagements.map((entry) => {
            const isCurrent = entry.end === null;
            return (
              <li
                key={`${entry.company}-${entry.start}`}
                className={`relative pb-8.5 before:absolute before:top-[7px] before:-left-7 before:size-3 before:rounded-full before:border-2 ${
                  isCurrent
                    ? 'before:border-accent before:bg-accent before:shadow-[0_0_0_4px_rgba(90,209,192,0.15)]'
                    : 'before:border-line-soft before:bg-bg'
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <span className="text-[1.02rem] font-semibold">
                    {entry.role}
                  </span>
                  <span className="font-semibold text-accent">
                    {entry.company}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 font-mono text-[0.65rem] tracking-widest uppercase text-amber">
                      Current
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 mb-2.5 font-mono text-xs text-dimmer">
                  {formatRange(entry.start, entry.end)} · {entry.location}
                  {entry.note ? ` · ${entry.note}` : ''}
                </p>

                {entry.bullets ? (
                  <ul className="mb-3 list-disc pl-4.5 text-[0.92rem] text-dim">
                    {entry.bullets.map((bullet) => (
                      <li key={bullet} className="mb-1.5">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {entry.stack ? (
                  <TagList items={entry.stack} className="mt-2.5" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <details className="mt-2 rounded-xl border border-line-soft bg-surface px-5 py-4 [&[open]_summary]:before:content-['▾_']">
          <summary className="cursor-pointer list-none font-semibold text-text before:text-accent before:content-['▸_'] [&::-webkit-details-marker]:hidden">
            {earlierCareerSummary}
          </summary>
          <ul className="mt-4 border-t border-line-soft pt-4">
            {earlierCareer.map((role) => (
              <li
                key={`${role.company}-${role.period}`}
                className="flex flex-wrap justify-between gap-2 border-line-soft py-2 text-[0.9rem] text-dim not-first:border-t not-first:border-dashed"
              >
                <span>
                  <span className="text-text">{role.company}</span> — {role.role}
                </span>
                <span>
                  {role.location} · {role.period}
                </span>
              </li>
            ))}
          </ul>
        </details>

        {/* FR-4b: one line, stated plainly, no expansion, no dressing up. */}
        <p className="mt-7 rounded-xl border border-dashed border-line px-5 py-4.5 text-[0.92rem] text-dim">
          <strong className="font-semibold text-text">Education.</strong>{' '}
          {education.institution} — {education.program}. {education.location},{' '}
          {education.completed}.
        </p>
      </div>
    </section>
  );
}

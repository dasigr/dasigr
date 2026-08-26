/**
 * FR-3. Server Component. Presentational only — no proficiency bars, ever.
 */

import { SectionHeading } from '@/components/ui/section-heading';
import { TagList } from '@/components/ui/tag-list';
import { skillGroups } from '@/content/skills';

interface SkillsSectionProps {
  eyebrow: string;
}

export function SkillsSection({ eyebrow }: SkillsSectionProps) {
  return (
    <section
      id="skills"
      className="border-t border-line-soft py-16 lg:py-22"
      aria-labelledby="skills-heading"
    >
      <div className="mx-auto w-full max-w-page px-5">
        <SectionHeading
          headingId="skills-heading"
          eyebrow={eyebrow}
          title="What I work with"
          lede="Grouped by where they sit in a build. No proficiency bars — a percentage next to a language name means nothing to the person reading it."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {skillGroups.map((group) => (
            <article
              key={group.name}
              className={`rounded-xl border border-line-soft bg-surface p-5.5 ${
                group.wide ? 'md:col-span-2' : ''
              }`}
            >
              <h3 className="mb-1.5 flex items-center gap-2 text-[1.05rem] font-semibold tracking-tight">
                <span aria-hidden="true">{group.icon}</span>
                {group.name}
              </h3>
              <TagList items={group.skills} className="mt-3.5" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

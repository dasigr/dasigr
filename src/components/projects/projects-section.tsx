/**
 * FR-5. Server Component.
 *
 * The heading interpolates leadProjectCount and maintenanceClientCount rather than
 * naming numbers. The site and the resume have already drifted apart once (11/11 vs
 * 8/3) — copy that reads `{leadProjectCount} sites led` cannot drift again.
 */

import { ProjectCard } from '@/components/projects/project-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { joinNames } from '@/lib/format';
import {
  additionalLeadProjects,
  featuredProjects,
  leadProjectCount,
  maintenanceClientCount,
  maintenanceClients,
} from '@/lib/mock-data';

interface ProjectsSectionProps {
  eyebrow: string;
}

export function ProjectsSection({ eyebrow }: ProjectsSectionProps) {
  const ongoing = maintenanceClients.filter((c) => c.status === 'ongoing');
  const previous = maintenanceClients.filter((c) => c.status === 'previous');

  return (
    <section
      id="projects"
      className="border-t border-line-soft py-16 lg:py-22"
      aria-labelledby="projects-heading"
    >
      <div className="mx-auto w-full max-w-page px-5">
        <SectionHeading
          headingId="projects-heading"
          eyebrow={eyebrow}
          lede="Every URL verified August 2026. Sites that died, were rebuilt by someone else, or no longer show my work were removed rather than left to fail a click."
        >
          {leadProjectCount} sites led · {maintenanceClientCount} clients
          maintained
        </SectionHeading>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>

        <h3 className="mt-14 mb-4 text-base font-semibold">
          Additional lead work
        </h3>
        <ul className="border-t border-line-soft">
          {additionalLeadProjects.map((project) => (
            <li
              key={project.slug}
              className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-b border-line-soft px-0.5 py-3.5"
            >
              {project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-47.5 font-semibold text-accent hover:underline"
                >
                  {project.title} ↗
                </a>
              ) : (
                <span className="min-w-47.5 font-semibold">
                  {project.title}
                </span>
              )}
              <span className="font-mono text-[0.82rem] text-dimmer">
                {project.stack.slice(0, 2).join(' · ')}
              </span>
              <span className="flex-1 text-[0.85rem] text-dim">
                {project.description}
              </span>
            </li>
          ))}
        </ul>

        {/* One line naming maintenance clients. Ongoing and previous are kept apart —
            implying current involvement in work that has ended is the failure mode
            §6.6 flags for Pro-Physik, and it applies to all of them equally. */}
        {maintenanceClients.length > 0 ? (
          <p className="mt-8 rounded-xl border border-line-soft bg-surface px-5 py-4.5 text-[0.92rem] text-dim">
            {ongoing.length > 0 ? (
              <>
                <strong className="font-semibold text-text">
                  Maintained for:
                </strong>{' '}
                {joinNames(ongoing.map((client) => client.name))} — ongoing.{' '}
              </>
            ) : null}
            {previous.length > 0 ? (
              <>
                <strong className="font-semibold text-text">
                  Previously maintained for:
                </strong>{' '}
                {joinNames(previous.map((client) => client.name))}.
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}

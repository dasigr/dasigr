/**
 * FR-5 card. Server Component.
 *
 * Two things here are gates rather than styling:
 *
 * 1. NO case-study link. `caseStudySlugs` is non-empty in the mock data, but
 *    /projects/[slug] does not exist yet in this feature — a link to it would be the
 *    dead link FR-5 forbids. When that route lands, the link belongs here, guarded by
 *    getCaseStudy(slug).
 * 2. The thumbnail renders only if the file is actually in public/. None of the
 *    screenshots have been taken, so every card currently shows the placeholder; drop
 *    a WebP at the path in mock-data and the image appears with no code change.
 */

import Image from 'next/image';
import { TagList } from '@/components/ui/tag-list';
import { publicAssetExists } from '@/lib/assets';
import { formatUrlLabel, formatVerified } from '@/lib/format';
import type { Project } from '@/lib/mock-data';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const hasThumbnail = publicAssetExists(project.thumbnailUrl);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line-soft bg-surface hover:border-line">
      {hasThumbnail ? (
        <Image
          src={project.thumbnailUrl}
          alt={`Screenshot of the ${project.title} home page`}
          width={800}
          height={600}
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          className="aspect-4/3 w-full border-b border-line-soft object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="grid aspect-4/3 w-full place-items-center border-b border-line-soft bg-linear-150 from-surface-2 to-bg-alt p-3 text-center font-mono text-[0.7rem] text-dimmer"
        >
          Screenshot pending
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1.5 text-[1.05rem] font-semibold tracking-tight">
          {project.title}
        </h3>
        <p className="mb-2.5 font-mono text-[0.72rem] tracking-wider uppercase text-dimmer">
          {project.role}
        </p>
        <p className="mb-3.5 text-[0.9rem] text-dim">{project.description}</p>

        <TagList items={project.stack} />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-line-soft pt-4">
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {formatUrlLabel(project.liveUrl)} ↗
            </a>
          ) : (
            <span className="text-sm text-dimmer">No public URL</span>
          )}
          <span className="font-mono text-[0.7rem] text-dimmer">
            <span aria-hidden="true" className="text-accent-dark">
              ✓{' '}
            </span>
            {formatVerified(project.lastVerified)}
          </span>
        </div>
      </div>
    </article>
  );
}

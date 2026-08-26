/**
 * src/lib/resume.ts
 *
 * Locates and reads the gated PDF. **Server-only** — importing this from a Client
 * Component breaks the build, which is the desired outcome: FR-7a means the file
 * has no client-side representation at all.
 *
 * WHY IT LIVES IN private/ AND NOT public/: anything under public/ is served at its
 * own URL by the static handler. One file in the wrong directory and the form gate
 * becomes decorative — no code would fail, and nothing would look wrong.
 *
 * The cost of that choice is the ENOENT-in-production-only failure: the file is not
 * a module import, so Next's build-time tracing cannot see it, and the serverless
 * bundle ships without it unless `outputFileTracingIncludes` in next.config.ts names
 * it. It works locally either way. See §11 and next.config.ts.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RESUME_ATTACHMENT_FILENAME } from '@/lib/contact-email';

/** Outside public/. Read through process.cwd() — §11. */
export const RESUME_DIRECTORY = 'private';

/**
 * The file on disk is named exactly as it arrives in the recruiter's inbox. One
 * name, no mapping to keep in sync.
 */
export function resumeFilePath(cwd: string = process.cwd()): string {
  return join(cwd, RESUME_DIRECTORY, RESUME_ATTACHMENT_FILENAME);
}

export function resumeExists(cwd: string = process.cwd()): boolean {
  return existsSync(resumeFilePath(cwd));
}

/**
 * Throws rather than returning null. A missing resume is not a degraded response —
 * it is the whole point of the request, and the route turns this into the §8 500
 * with the mailto: fallback so the lead survives.
 */
export function readResumeFile(cwd: string = process.cwd()): Buffer {
  return readFileSync(resumeFilePath(cwd));
}

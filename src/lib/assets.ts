/**
 * src/lib/assets.ts
 *
 * Does a file referenced by an absolute public path actually exist in public/?
 *
 * WHY THIS EXISTS: mock-data.ts names a thumbnail for every project
 * (`/images/projects/cebufest.webp`), but the screenshots have not been taken yet.
 * Rendering <Image> against a missing file gives eight broken images; hardcoding
 * placeholders means the real screenshots do nothing when they land. This lets a
 * component ask, and switch from placeholder to image the moment a file appears.
 *
 * Server-only. The page that calls it is statically generated, so every lookup
 * happens at build time and nothing touches the filesystem at request time.
 */

import { existsSync } from 'node:fs';
import { join, normalize } from 'node:path';

/**
 * @param publicPath A root-relative path as written in content, e.g. "/images/a.webp".
 * @returns false for anything that is not a simple root-relative path — an external
 *   URL, a traversal attempt, or an empty string — rather than throwing.
 */
export function publicAssetExists(publicPath: string): boolean {
  if (!publicPath.startsWith('/') || publicPath.startsWith('//')) return false;

  const relative = normalize(publicPath).replace(/^[/\\]+/, '');
  if (relative.length === 0 || relative.startsWith('..')) return false;

  return existsSync(join(process.cwd(), 'public', relative));
}

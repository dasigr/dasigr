/**
 * src/lib/format.ts — small display helpers, kept out of components so they can be
 * unit-tested (see context/coding-standards.md on where branching logic belongs).
 */

/**
 * "https://www.cebufest.com" → "cebufest.com". Protocol and a leading www are noise
 * in a link label; a trailing slash is worse. Returns the input unchanged if it is
 * not parseable as a URL, so a malformed entry is visible rather than blanked out.
 */
export function formatUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host.replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/$/, '');
    return `${host}${path}`;
  } catch {
    return url;
  }
}

/** "2026-08" → "Verified 2026-08". Kept as-is: an exact month is the point. */
export function formatVerified(lastVerified: string): string {
  return `Verified ${lastVerified}`;
}

/** Joins names into "A · B" / "A · B · C". Used for the maintenance-clients line. */
export function joinNames(names: string[]): string {
  return names.join(' · ');
}

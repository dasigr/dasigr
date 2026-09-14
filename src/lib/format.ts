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

/**
 * The Projects lede claims every URL was checked, and has to name when. It used to
 * say "August 2026" in prose, which went stale the moment one entry was verified in
 * a different month (Sugbo Rentals, 2026-09) — the same drift the derived counts
 * exist to prevent, in the one sentence that was still hardcoded.
 *
 * ["2026-08", "2026-09"] → "August–September 2026". A single month reads
 * "August 2026"; a span crossing a year reads "August 2026–January 2027". Unparseable
 * entries are ignored rather than rendered, and an empty list returns "" so the caller
 * can drop the claim entirely instead of printing a date-shaped blank.
 */
export function formatVerifiedWindow(months: string[]): string {
  const parsed = months
    .filter((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m))
    .sort();
  if (parsed.length === 0) return '';

  const name = (month: string) =>
    new Date(`${month}-01T00:00:00Z`).toLocaleString('en-US', {
      month: 'long',
      timeZone: 'UTC',
    });

  const first = parsed[0];
  const last = parsed[parsed.length - 1];
  if (first === last) return `${name(first)} ${first.slice(0, 4)}`;

  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  return sameYear
    ? `${name(first)}–${name(last)} ${last.slice(0, 4)}`
    : `${name(first)} ${first.slice(0, 4)}–${name(last)} ${last.slice(0, 4)}`;
}

/** Joins names into "A · B" / "A · B · C". Used for the maintenance-clients line. */
export function joinNames(names: string[]): string {
  return names.join(' · ');
}

/**
 * src/lib/navigation.ts
 *
 * The section list, and the nav derived from it.
 *
 * This is a hard gate, not a convenience (§6.6): when nothing is publishable, the
 * Testimonials section AND its nav item disappear together. A hardcoded nav array is
 * how you end up with a link that scrolls to nothing, so the array is built here from
 * the same flag the section itself reads.
 *
 * Section numbering ("01 — About") is derived for the same reason — hide Testimonials
 * and Contact renumbers itself rather than leaving a hole at 05.
 *
 * The lower half decides which nav link is the active one. It lives here rather than
 * in the header for the usual reason — it is branching, and branching is only
 * testable once it is out of the component. Everything below takes numbers and
 * returns an id; the header does the measuring.
 */

export interface SectionDefinition {
  id: string;
  label: string;
  /** 1-based position among the numbered sections. Hero is not numbered. */
  index: number;
  /** "05 — Testimonials". */
  eyebrow: string;
}

export interface NavItem {
  href: string;
  label: string;
}

export interface NavigationInput {
  hasTestimonials: boolean;
}

const BASE_SECTIONS: { id: string; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'contact', label: 'Contact' },
];

export function buildSections({
  hasTestimonials,
}: NavigationInput): SectionDefinition[] {
  return BASE_SECTIONS.filter(
    (section) => section.id !== 'testimonials' || hasTestimonials,
  ).map((section, position) => {
    const index = position + 1;
    return {
      ...section,
      index,
      eyebrow: `${String(index).padStart(2, '0')} — ${section.label}`,
    };
  });
}

export function buildNavItems(input: NavigationInput): NavItem[] {
  return buildSections(input).map((section) => ({
    href: `#${section.id}`,
    label: section.label,
  }));
}

/**
 * The ids the nav actually links to. The header needs these to measure sections and
 * to match a hash; deriving them from the nav rather than re-listing them is what
 * stops a hidden Testimonials section from leaving a highlightable ghost behind.
 */
export function sectionIdsFromNav(items: readonly NavItem[]): string[] {
  return items.map((item) => item.href.replace(/^#/, ''));
}

/** Where a section's top edge sits relative to the reading line, in px. */
export interface SectionPosition {
  id: string;
  /** Negative once the section has crossed the line and the reader is inside it. */
  top: number;
}

/** Sub-pixel rounding: a section resting exactly on the line reads as ±0.5px. */
const READING_LINE_TOLERANCE = 1;

/**
 * Which section the reader is in, given every section's offset from the reading
 * line — the line `scroll-padding-top` lands hash targets on, just under the sticky
 * header. A section is active once its top edge reaches that line; the deepest such
 * section wins, so the answer does not depend on the array being in document order.
 *
 * Returns null above the first section (the Hero, which has no nav item).
 */
export function pickActiveSection(
  positions: readonly SectionPosition[],
  { atBottom = false }: { atBottom?: boolean } = {},
): string | null {
  if (positions.length === 0) return null;

  // The page can run out of scroll before a short final section reaches the line.
  // Without this, clicking Contact scrolls as far as it can and leaves Projects
  // highlighted — the one case where "top edge crossed the line" never happens.
  if (atBottom) {
    return positions.reduce((lowest, candidate) =>
      candidate.top > lowest.top ? candidate : lowest,
    ).id;
  }

  let active: SectionPosition | null = null;
  for (const position of positions) {
    if (position.top > READING_LINE_TOLERANCE) continue;
    if (!active || position.top > active.top) active = position;
  }
  return active?.id ?? null;
}

/**
 * The section a hash addresses, or null if it addresses something that is not a
 * navigable section — `#top` (the brand), `#main` (the skip link), a stale hash from
 * a hidden section, or no hash at all.
 */
export function activeSectionFromHash(
  hash: string,
  sectionIds: readonly string[],
): string | null {
  if (!hash.startsWith('#')) return null;

  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    // A malformed hash is a URL someone typed, not a bug worth throwing during
    // hydration.
    return null;
  }

  return sectionIds.includes(id) ? id : null;
}

/** Convenience for a section that needs its own eyebrow. Throws on an unknown id. */
export function sectionEyebrow(
  sections: SectionDefinition[],
  id: string,
): string {
  const section = sections.find((candidate) => candidate.id === id);
  if (!section) {
    throw new Error(`No section registered with id "${id}"`);
  }
  return section.eyebrow;
}

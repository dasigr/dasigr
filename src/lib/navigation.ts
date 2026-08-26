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

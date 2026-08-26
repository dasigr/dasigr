import { describe, expect, it } from 'vitest';

import {
  activeSectionFromHash,
  buildNavItems,
  buildSections,
  pickActiveSection,
  sectionEyebrow,
  sectionIdsFromNav,
} from '@/lib/navigation';

describe('buildSections', () => {
  it('numbers every section when testimonials are publishable', () => {
    const sections = buildSections({ hasTestimonials: true });

    expect(sections.map((s) => s.id)).toEqual([
      'about',
      'skills',
      'experience',
      'projects',
      'testimonials',
      'contact',
    ]);
    expect(sections[0].eyebrow).toBe('01 — About');
    expect(sections.at(-1)?.eyebrow).toBe('06 — Contact');
  });

  it('renumbers rather than leaving a hole when testimonials are hidden', () => {
    const sections = buildSections({ hasTestimonials: false });

    expect(sections.map((s) => s.id)).not.toContain('testimonials');
    expect(sections.at(-1)?.eyebrow).toBe('05 — Contact');
    expect(sections.map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('buildNavItems', () => {
  it('drops the testimonials link with the section — the gate is the pairing', () => {
    const withQuotes = buildNavItems({ hasTestimonials: true });
    const without = buildNavItems({ hasTestimonials: false });

    expect(withQuotes).toContainEqual({
      href: '#testimonials',
      label: 'Testimonials',
    });
    expect(without.map((item) => item.href)).not.toContain('#testimonials');
  });

  it('points every item at a section that is actually rendered', () => {
    for (const hasTestimonials of [true, false]) {
      const sections = buildSections({ hasTestimonials });
      const ids = new Set(sections.map((section) => section.id));

      for (const item of buildNavItems({ hasTestimonials })) {
        expect(ids.has(item.href.replace('#', ''))).toBe(true);
      }
    }
  });
});

describe('sectionIdsFromNav', () => {
  it('strips the hash so the ids match element ids', () => {
    expect(sectionIdsFromNav(buildNavItems({ hasTestimonials: false }))).toEqual([
      'about',
      'skills',
      'experience',
      'projects',
      'contact',
    ]);
  });
});

describe('pickActiveSection', () => {
  // Offsets from the reading line: negative = already crossed it.
  const scrolledIntoExperience = [
    { id: 'about', top: -1400 },
    { id: 'skills', top: -700 },
    { id: 'experience', top: -40 },
    { id: 'projects', top: 620 },
    { id: 'contact', top: 1300 },
  ];

  it('picks the deepest section that has reached the line', () => {
    expect(pickActiveSection(scrolledIntoExperience)).toBe('experience');
  });

  it('is null above the first section — the Hero has no nav item', () => {
    expect(
      pickActiveSection([
        { id: 'about', top: 240 },
        { id: 'skills', top: 900 },
      ]),
    ).toBeNull();
  });

  it('activates a section resting exactly on the line', () => {
    expect(
      pickActiveSection([
        { id: 'about', top: 0 },
        { id: 'skills', top: 700 },
      ]),
    ).toBe('about');
  });

  it('tolerates sub-pixel rounding at the boundary', () => {
    expect(
      pickActiveSection([{ id: 'about', top: 0.5 }, { id: 'skills', top: 700 }]),
    ).toBe('about');
    expect(
      pickActiveSection([{ id: 'about', top: 4 }, { id: 'skills', top: 700 }]),
    ).toBeNull();
  });

  it('hands the last section the highlight once the page runs out of scroll', () => {
    // Contact is shorter than the viewport: its top never reaches the line, so
    // without the atBottom rule the highlight would stick on Projects forever.
    const atDocumentEnd = [
      { id: 'projects', top: -900 },
      { id: 'contact', top: 120 },
    ];

    expect(pickActiveSection(atDocumentEnd)).toBe('projects');
    expect(pickActiveSection(atDocumentEnd, { atBottom: true })).toBe('contact');
  });

  it('does not depend on the array being in document order', () => {
    const shuffled = [...scrolledIntoExperience].reverse();

    expect(pickActiveSection(shuffled)).toBe('experience');
    expect(pickActiveSection(shuffled, { atBottom: true })).toBe('contact');
  });

  it('returns null when there is nothing to highlight', () => {
    expect(pickActiveSection([])).toBeNull();
    expect(pickActiveSection([], { atBottom: true })).toBeNull();
  });
});

describe('activeSectionFromHash', () => {
  const ids = sectionIdsFromNav(buildNavItems({ hasTestimonials: false }));

  it('matches a shared /#projects link', () => {
    expect(activeSectionFromHash('#projects', ids)).toBe('projects');
  });

  it('ignores hashes that are not navigable sections', () => {
    // #top is the brand, #main the skip link — both are real elements with no nav
    // item, and both should clear the highlight rather than fail to match.
    expect(activeSectionFromHash('#top', ids)).toBeNull();
    expect(activeSectionFromHash('#main', ids)).toBeNull();
    expect(activeSectionFromHash('', ids)).toBeNull();
    expect(activeSectionFromHash('#', ids)).toBeNull();
  });

  it('ignores a hash for a section the gate removed', () => {
    expect(activeSectionFromHash('#testimonials', ids)).toBeNull();
    expect(
      activeSectionFromHash(
        '#testimonials',
        sectionIdsFromNav(buildNavItems({ hasTestimonials: true })),
      ),
    ).toBe('testimonials');
  });

  it('decodes an escaped hash and survives a malformed one', () => {
    expect(activeSectionFromHash('#%70rojects', ids)).toBe('projects');
    expect(activeSectionFromHash('#%E0%A4%A', ids)).toBeNull();
  });
});

describe('sectionEyebrow', () => {
  it('returns the numbered eyebrow for a known section', () => {
    const sections = buildSections({ hasTestimonials: true });
    expect(sectionEyebrow(sections, 'projects')).toBe('04 — Projects');
  });

  it('throws rather than rendering an empty eyebrow', () => {
    const sections = buildSections({ hasTestimonials: false });
    expect(() => sectionEyebrow(sections, 'testimonials')).toThrow(
      /No section registered/,
    );
  });
});

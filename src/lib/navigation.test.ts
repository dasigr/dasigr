import { describe, expect, it } from 'vitest';

import {
  buildNavItems,
  buildSections,
  sectionEyebrow,
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

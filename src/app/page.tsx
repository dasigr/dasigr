/**
 * One page, seven sections, hash anchors — not seven routes (§5.1).
 *
 * Every section below is a Server Component. The single 'use client' boundary on this
 * page is SiteHeader, which needs state for the mobile menu; First Load JS for `/` is
 * budgeted under 120 KB gzipped, and a regression in the `next build` figure will
 * almost always trace to a new boundary rather than to content.
 *
 * `asOf` is read once, here, and threaded down. Sections never read a clock of their
 * own — that is what keeps the durations on the page consistent with each other and
 * the career maths unit-testable.
 */

import { AboutSection } from '@/components/about/about-section';
import { ContactSection } from '@/components/contact/contact-section';
import { ExperienceSection } from '@/components/experience/experience-section';
import { HeroSection } from '@/components/hero/hero-section';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ProjectsSection } from '@/components/projects/projects-section';
import { SkillsSection } from '@/components/skills/skills-section';
import { TestimonialsSection } from '@/components/testimonials/testimonials-section';
import { profile } from '@/content/profile';
import { summariseCareer, toYearMonth } from '@/lib/career';
import { hasTestimonials } from '@/lib/mock-data';
import { buildNavItems, buildSections, sectionEyebrow } from '@/lib/navigation';

export default function Home() {
  const now = new Date();
  const career = summariseCareer(toYearMonth(now));

  // Both the nav and the section eyebrows come from one derived list, so hiding
  // Testimonials removes its nav item and renumbers Contact in the same step.
  const sections = buildSections({ hasTestimonials });
  const navItems = buildNavItems({ hasTestimonials });

  return (
    <>
      <a
        href="#main"
        className="absolute top-3 left-3 z-200 -translate-y-24 rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-ink transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <SiteHeader navItems={navItems} brand={profile.name} />

      <main id="main" className="flex-1">
        <HeroSection career={career} />
        <AboutSection eyebrow={sectionEyebrow(sections, 'about')} />
        <SkillsSection eyebrow={sectionEyebrow(sections, 'skills')} />
        <ExperienceSection eyebrow={sectionEyebrow(sections, 'experience')} />
        <ProjectsSection eyebrow={sectionEyebrow(sections, 'projects')} />
        {hasTestimonials ? (
          <TestimonialsSection
            eyebrow={sectionEyebrow(sections, 'testimonials')}
          />
        ) : null}
        <ContactSection eyebrow={sectionEyebrow(sections, 'contact')} />
      </main>

      <SiteFooter year={now.getFullYear()} />
    </>
  );
}

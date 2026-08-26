/**
 * FR-1. Server Component.
 *
 * The portrait uses explicit width/height so its space is reserved before it loads —
 * a hero image that reflows the headline is the layout shift the budget exists to
 * prevent. Note `preload`, not `priority`: `priority` is deprecated as of Next 16.
 */

import Image from 'next/image';
import { CareerBus } from '@/components/hero/career-bus';
import {
  portraits,
  positioningStatement,
  profile,
  socials,
} from '@/content/profile';
import type { CareerSummary } from '@/lib/career';

interface HeroSectionProps {
  career: CareerSummary;
}

export function HeroSection({ career }: HeroSectionProps) {
  const facts = [
    { label: 'Experience', value: career.phrase },
    { label: 'Location', value: profile.location },
    { label: 'Availability', value: profile.availability },
    { label: 'Focus', value: profile.focus },
  ];

  return (
    <section id="top" className="pt-18 pb-16 lg:pb-22">
      <div className="mx-auto w-full max-w-page px-5">
        <div className="grid items-center gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:gap-12">
          <div>
            <p className="mb-2 font-mono text-xs tracking-[0.12em] uppercase text-accent">
              {profile.location} · {profile.availability}
            </p>
            <h1 className="mb-4 text-[clamp(2.1rem,6vw,3.4rem)] leading-[1.1] font-bold tracking-tight">
              {profile.name}
              <br />
              {profile.title}
            </h1>
            <p className="mb-7 max-w-[54ch] text-[1.1rem] text-dim">
              {positioningStatement(career.phrase)}
            </p>

            <div className="mb-7 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-accent-ink hover:bg-accent-bright hover:no-underline"
              >
                Get My Resume →
              </a>
              <a
                href="#projects"
                className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 font-semibold text-text hover:border-accent hover:text-accent hover:no-underline"
              >
                View Projects
              </a>
            </div>

            <ul className="flex gap-4.5 text-[0.9rem]">
              {socials.map((social) => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dim hover:text-accent"
                  >
                    {social.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-first mx-auto w-full max-w-[220px] lg:order-none lg:max-w-none">
            <Image
              src={portraits.headshot.src}
              alt={portraits.headshot.alt}
              width={portraits.headshot.width}
              height={portraits.headshot.height}
              preload
              sizes="(max-width: 1024px) 220px, 340px"
              className="aspect-square w-full rounded-full border border-line object-cover"
            />
          </div>
        </div>

        <CareerBus career={career} />

        <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="bg-surface px-5 py-4.5">
              <dt className="mb-1 font-mono text-[0.7rem] tracking-widest uppercase text-dimmer">
                {fact.label}
              </dt>
              <dd className="font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

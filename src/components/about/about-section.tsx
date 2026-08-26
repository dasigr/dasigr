/**
 * FR-2. Server Component.
 *
 * The portrait's alt text describes the actual person — the spec calls this out
 * explicitly because the placeholder it replaced said "John Doe".
 */

import Image from 'next/image';
import { SectionHeading } from '@/components/ui/section-heading';
import { aboutParagraphs, portraits } from '@/content/profile';

interface AboutSectionProps {
  eyebrow: string;
}

export function AboutSection({ eyebrow }: AboutSectionProps) {
  return (
    <section
      id="about"
      className="border-t border-line-soft py-16 lg:py-22"
      aria-labelledby="about-heading"
    >
      <div className="mx-auto w-full max-w-page px-5">
        {/* No number in the heading on purpose — a spelled-out "Seventeen years"
            goes quietly wrong on its next birthday. */}
        <SectionHeading
          headingId="about-heading"
          eyebrow={eyebrow}
          title="Since 2008, one continuous line"
        />
        <div className="grid items-start gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <Image
            src={portraits.full.src}
            alt={portraits.full.alt}
            width={portraits.full.width}
            height={portraits.full.height}
            sizes="(max-width: 1024px) 100vw, 380px"
            className="aspect-4/5 w-full rounded-xl border border-line object-cover object-top"
          />
          <div>
            {aboutParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="mb-4.5 text-dim">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

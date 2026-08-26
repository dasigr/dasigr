/**
 * FR-9. Server Component.
 *
 * ── THE GATE ───────────────────────────────────────────────────────────────────
 * This component reads `publishableTestimonials` and nothing else. A testimonial
 * with `consentObtained: null`, or with an empty quote, must never reach the page:
 * each of the four real entries names a person and three name an employer, so
 * republishing them without consent is processing personal data under RA 10173 and,
 * for an EU-based reader, GDPR.
 *
 * The caller also checks `hasTestimonials` and drops the nav item along with the
 * section — a nav link scrolling to a heading that is not there is the failure this
 * pairing exists to prevent.
 *
 * `hasTestimonials` currently reads false because `testimonialsEnabled` is off, so
 * this section is built but not shown. It also covers the empty case, which is why
 * the guard below reads it rather than counting the array a second time.
 *
 * NOTE: the three quotes this renders once enabled are FICTIONAL development
 * fixtures. They exist so this layout can be seen. Replacing them is a content change.
 */

import { SectionHeading } from '@/components/ui/section-heading';
import { hasTestimonials, publishableTestimonials } from '@/lib/mock-data';

interface TestimonialsSectionProps {
  eyebrow: string;
}

export function TestimonialsSection({ eyebrow }: TestimonialsSectionProps) {
  if (!hasTestimonials) return null;

  return (
    <section
      id="testimonials"
      className="border-t border-line-soft py-16 lg:py-22"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto w-full max-w-page px-5">
        <SectionHeading
          headingId="testimonials-heading"
          eyebrow={eyebrow}
          title="What clients said"
          lede="Quotes are verbatim and published with permission. Static grid, no carousel — a recruiter skimming for sixty seconds should see all of them at once."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {publishableTestimonials.map((testimonial) => (
            <figure
              key={testimonial.id}
              className="flex flex-col rounded-xl border border-line-soft bg-surface p-6"
            >
              <blockquote className="mb-4.5 text-[0.95rem] leading-relaxed">
                {testimonial.quote}
              </blockquote>
              <figcaption className="mt-auto border-t border-line-soft pt-3.5 text-[0.85rem]">
                <span className="block font-semibold">{testimonial.author}</span>
                <span className="block text-dimmer">
                  {[testimonial.role, testimonial.company]
                    .filter(Boolean)
                    .join(', ')}
                  {testimonial.date ? ` · ${testimonial.date.slice(0, 4)}` : ''}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

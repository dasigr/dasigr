/**
 * FR-6 and FR-8. Server Component.
 *
 * FR-8 exists because a form is friction: some recruiters will leave rather than fill
 * one in. The direct channels beside it are the escape hatch that keeps that cost
 * from becoming a lost lead.
 */

import { ContactForm } from '@/components/contact/contact-form';
import { SectionHeading } from '@/components/ui/section-heading';
import { profile, socials } from '@/content/profile';

interface ContactSectionProps {
  eyebrow: string;
}

export function ContactSection({ eyebrow }: ContactSectionProps) {
  return (
    <section
      id="contact"
      className="border-t border-line-soft py-16 lg:py-22"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto w-full max-w-page px-5">
        <SectionHeading
          headingId="contact-heading"
          eyebrow={eyebrow}
          title="Get the resume"
          lede="Four fields. The PDF arrives by email, usually inside a minute."
        />

        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <ContactForm />

          <aside>
            <h3 className="mb-2.5 text-[1.05rem] font-semibold tracking-tight">
              Direct channels
            </h3>
            <p className="mb-5.5 text-[0.92rem] text-dim">
              If a form is not your thing, any of these reaches me.
            </p>

            <ul className="mb-6.5">
              <li className="border-b border-line-soft py-3 text-[0.92rem]">
                <span className="block font-mono text-[0.7rem] tracking-widest uppercase text-dimmer">
                  Email
                </span>
                <a
                  href={`mailto:${profile.email}`}
                  className="text-accent hover:underline"
                >
                  {profile.emailDisplay}
                </a>
              </li>
              {socials.map((social) => (
                <li
                  key={social.href}
                  className="border-b border-line-soft py-3 text-[0.92rem]"
                >
                  <span className="block font-mono text-[0.7rem] tracking-widest uppercase text-dimmer">
                    {social.label}
                  </span>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {social.handle} ↗
                  </a>
                </li>
              ))}
              <li className="border-b border-line-soft py-3 text-[0.92rem]">
                <span className="block font-mono text-[0.7rem] tracking-widest uppercase text-dimmer">
                  Based in
                </span>
                {profile.location} · UTC+8
              </li>
            </ul>

            {/* FR-7a, stated to the reader rather than only enforced in code. */}
            <div className="rounded-xl border border-accent/25 bg-accent/7 px-4.5 py-4 text-[0.87rem] text-dim">
              <strong className="font-semibold text-accent">Why a form?</strong>{' '}
              The resume is not posted anywhere on this site — the only copy is the
              one emailed to you. It keeps the file current and lets me know who
              asked. Forward it freely once you have it.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

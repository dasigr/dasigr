/**
 * Server Component. Deliberately carries NO resume link (FR-7a) — the PDF is only
 * ever delivered by email, and a footer download link would quietly undo the gate.
 */

import { profile, socials } from '@/content/profile';

interface SiteFooterProps {
  /** Passed in so the build stamps it once, rather than each component reading a clock. */
  year: number;
}

export function SiteFooter({ year }: SiteFooterProps) {
  return (
    <footer className="border-t border-line-soft py-8 pb-12 text-sm text-dimmer">
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center justify-between gap-3 px-5">
        <span>
          © {year} {profile.name} · {profile.location}
        </span>
        <nav aria-label="Footer" className="flex flex-wrap gap-4.5">
          <a href="#top" className="text-accent hover:underline">
            Back to top
          </a>
          {socials.map((social) => (
            <a
              key={social.href}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {social.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

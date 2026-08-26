/**
 * §9.5. The notice FR-6's consent checkbox links to.
 *
 * The Data Privacy Act of 2012 (RA 10173) applies because the site collects
 * personal data in the Philippines; GDPR may apply to an EU-based recruiter. Both
 * want the same thing here: the person ticking the box knows what happens next.
 *
 * ⚠️ Every claim below must stay true of the code. There is no database — the
 * owner's mailbox is the only store — so this page describes a mailbox, not a
 * retention policy the setup cannot enforce. If a `Lead` table ever lands (§6.6,
 * v1.1), this page changes in the same commit.
 *
 * Server Component. No nav, deliberately: the site header's items are derived from
 * the single-page section list and this is not one of them.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { profile } from '@/content/profile';

export const metadata: Metadata = {
  title: `Privacy — ${profile.name}`,
  description:
    'What the contact form collects, why, how long it is kept, and how to have it deleted.',
};

const LAST_UPDATED = 'August 2026';

export default function PrivacyPage() {
  return (
    <>
      <main id="main" className="flex-1 py-16 lg:py-22">
        <div className="mx-auto w-full max-w-184 px-5">
          <Link
            href="/#contact"
            className="text-[0.85rem] text-accent hover:underline"
          >
            ← Back to the site
          </Link>

          <h1 className="mt-6 mb-2 text-[2rem] font-semibold tracking-tight">
            Privacy
          </h1>
          <p className="mb-10 text-[0.85rem] text-dimmer">
            Last updated {LAST_UPDATED}
          </p>

          <Section title="What the form collects">
            <p>
              Your name, email address, an optional company name, and whatever you
              write in the message box. Nothing else — there is no tracking script
              on this site and no cookie banner because there are no cookies to
              consent to.
            </p>
          </Section>

          <Section title="Why">
            <p>
              To send you the resume PDF if you asked for it, and to reply to you.
              That is the whole purpose. Your details are not used for marketing,
              not added to a mailing list, and not shared with anyone.
            </p>
          </Section>

          <Section title="Where it goes">
            <p>
              Two emails: one to you with the PDF attached, and one to me with what
              you wrote. They are sent through{' '}
              <a
                href="https://resend.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Resend
              </a>
              , which processes them in transit and keeps delivery logs.
            </p>
            <p>
              <strong className="font-semibold text-text">
                There is no database.
              </strong>{' '}
              This site stores nothing. Once the two emails are sent, the only copy
              of what you submitted is the one sitting in my mailbox.
            </p>
          </Section>

          <Section title="How long it is kept">
            <p>
              For as long as the conversation is live, and then as long as the
              message stays in my mailbox. I am describing what actually happens
              rather than quoting a retention period no part of this setup could
              enforce.
            </p>
          </Section>

          <Section title="Having it deleted">
            <p>
              Email me at{' '}
              <a
                href={`mailto:${profile.email}?subject=${encodeURIComponent(
                  'Please delete my details',
                )}`}
                className="text-accent hover:underline"
              >
                {profile.email}
              </a>{' '}
              and I will delete the message and confirm. You can also ask for a copy
              of what I hold, which will be the same email you already have.
            </p>
          </Section>

          <Section title="The resume PDF">
            <p>
              The PDF is not posted anywhere on this site; the emailed copy is the
              only one. That is about knowing who asked, not about controlling the
              file — once you have it, forward it wherever it is useful. It carries
              no watermark and no tracking.
            </p>
          </Section>
        </div>
      </main>

      <SiteFooter year={new Date().getFullYear()} />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-9">
      <h2 className="mb-2.5 text-[1.15rem] font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 text-[0.95rem] text-dim">{children}</div>
    </section>
  );
}

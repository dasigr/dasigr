'use client';

/**
 * FR-6 form. The site's SECOND `'use client'` boundary — the header's mobile menu
 * is the first, and that is the whole list. Every section around this stays a
 * Server Component (§NFR, First Load JS).
 *
 * Built on `useState` rather than react-hook-form on purpose: RHF would add a
 * dependency to the one bundle the budget actually tracks, to manage six fields
 * that already have a schema describing them.
 *
 * Three details in here are the contract rather than styling:
 *   - the resume checkbox is CHECKED by default, consent is NOT (FR-6 / §9.5);
 *   - `_website` is a honeypot whose server-side rejection IS NOT IMPLEMENTED in
 *     this feature. It is sent and ignored. Do not read the field's presence as
 *     protection — the route currently has none;
 *   - client validation is UX only. `parseContact` runs again in the route handler
 *     and that run is the control (§8).
 */

// `FormEvent` is deprecated in the React 19 types ("doesn't actually exist") —
// `SubmitEvent` is what `onSubmit` is actually declared against.
import Link from 'next/link';
import { useState, type ReactNode, type SubmitEvent } from 'react';

import { profile } from '@/content/profile';
import {
  CONTACT_LIMITS,
  parseContact,
  type ContactFieldErrors,
} from '@/lib/contact-schema';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface FormValues {
  name: string;
  email: string;
  company: string;
  message: string;
  requestResume: boolean;
  consent: boolean;
  _website: string;
}

const EMPTY: FormValues = {
  name: '',
  email: '',
  company: '',
  message: '',
  requestResume: true,
  consent: false,
  _website: '',
};

/** The fields that have a `<FieldError>` beneath them and can therefore show one. */
const RENDERED_ERROR_FIELDS = ['name', 'email', 'company', 'message', 'consent'];

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-bg-alt px-3.5 py-2.5 text-[0.92rem] placeholder:text-[#5f7686] focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none aria-[invalid=true]:border-amber';

export function ContactForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<ContactFieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [sentTo, setSentTo] = useState('');
  const [resumeSent, setResumeSent] = useState(true);

  const validation = parseContact(values);
  const clientErrors: ContactFieldErrors = validation.success
    ? {}
    : validation.errors;

  /**
   * A field shows an error only once it has been blurred or the form submitted.
   * Server errors win — they are the authoritative run, and they can name a
   * failure the client schema cannot see.
   */
  const errorFor = (field: keyof ContactFieldErrors): string | undefined =>
    serverErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);

  const setField = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Editing invalidates the server's opinion of this field; keeping it would
    // pin a stale message under an input the user has already fixed.
    setServerErrors((current) => {
      if (current[field as keyof ContactFieldErrors] === undefined) return current;
      const next = { ...current };
      delete next[field as keyof ContactFieldErrors];
      return next;
    });
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    setTouched({
      name: true,
      email: true,
      company: true,
      message: true,
      consent: true,
    });
    setServerErrors({});

    if (!validation.success) {
      setStatus('idle');
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const body = await response.json();

      if (response.status === 400 && body?.errors) {
        const errors = body.errors as ContactFieldErrors;
        setServerErrors(errors);

        // Only the five field keys have somewhere to render. A 400 naming
        // anything else — `form`, or a field this component does not draw —
        // would otherwise return the button to "Send" with nothing on screen and
        // no way forward. Fall through to the fallback instead of a dead end.
        const shown = Object.keys(errors).some((key) =>
          RENDERED_ERROR_FIELDS.includes(key),
        );
        setStatus(shown ? 'idle' : 'error');
        return;
      }

      if (!response.ok || body?.success !== true) {
        setStatus('error');
        return;
      }

      setSentTo(values.email.trim());
      setResumeSent(body.resumeSent === true);
      setStatus('success');
    } catch {
      // Offline, DNS, aborted — indistinguishable from here and handled the same:
      // show the mailto: fallback rather than swallowing the lead (FR-7a).
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        className="rounded-xl border border-accent/35 bg-accent/7 p-7"
      >
        <h3 className="mb-2 text-[1.15rem] font-semibold tracking-tight text-accent">
          {resumeSent ? 'On its way.' : 'Message received.'}
        </h3>
        <p className="text-[0.95rem] text-dim">
          {resumeSent ? (
            <>
              The resume is on its way to{' '}
              <strong className="font-semibold text-text">{sentTo}</strong>. It
              usually lands inside a minute — if it has not after five, check the
              spam folder, then email me at{' '}
              <a
                href={`mailto:${profile.email}`}
                className="text-accent hover:underline"
              >
                {profile.email}
              </a>
              .
            </>
          ) : (
            <>
              Thanks — your message reached me and I will reply to{' '}
              <strong className="font-semibold text-text">{sentTo}</strong>. You
              left the resume box unticked, so no PDF was sent.
            </>
          )}
        </p>
      </div>
    );
  }

  const busy = status === 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-line-soft bg-surface p-7"
      aria-label="Contact and resume request"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="mb-4.5 sm:mb-0">
          <Label htmlFor="contact-name">
            Name <Required />
          </Label>
          <input
            type="text"
            id="contact-name"
            name="name"
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Jane Recruiter"
            autoComplete="name"
            maxLength={CONTACT_LIMITS.nameMax}
            aria-invalid={errorFor('name') !== undefined}
            aria-describedby={errorFor('name') ? 'contact-name-error' : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="contact-name-error" message={errorFor('name')} />
        </div>
        <div>
          <Label htmlFor="contact-email">
            Email <Required />
          </Label>
          <input
            type="email"
            id="contact-email"
            name="email"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="jane@example.com"
            autoComplete="email"
            aria-invalid={errorFor('email') !== undefined}
            aria-describedby={
              errorFor('email') ? 'contact-email-error' : undefined
            }
            className={INPUT_CLASS}
          />
          <FieldError id="contact-email-error" message={errorFor('email')} />
        </div>
      </div>

      <div className="mt-4.5">
        <Label htmlFor="contact-company">
          Company{' '}
          <span className="text-[0.78rem] font-normal text-dimmer">
            — optional
          </span>
        </Label>
        <input
          type="text"
          id="contact-company"
          name="company"
          value={values.company}
          onChange={(event) => setField('company', event.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, company: true }))}
          placeholder="Acme Corp"
          autoComplete="organization"
          maxLength={CONTACT_LIMITS.companyMax}
          aria-invalid={errorFor('company') !== undefined}
          aria-describedby={
            errorFor('company') ? 'contact-company-error' : undefined
          }
          className={INPUT_CLASS}
        />
        <FieldError id="contact-company-error" message={errorFor('company')} />
      </div>

      <div className="mt-4.5">
        <Label htmlFor="contact-message">
          Message <Required />{' '}
          <span className="text-[0.78rem] font-normal text-dimmer">
            — {CONTACT_LIMITS.messageMin}–{CONTACT_LIMITS.messageMax} characters
          </span>
        </Label>
        <textarea
          id="contact-message"
          name="message"
          value={values.message}
          onChange={(event) => setField('message', event.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, message: true }))}
          placeholder="A little about the role or the project…"
          maxLength={CONTACT_LIMITS.messageMax}
          aria-invalid={errorFor('message') !== undefined}
          aria-describedby={
            errorFor('message') ? 'contact-message-error' : undefined
          }
          className={`min-h-32.5 resize-y ${INPUT_CLASS}`}
        />
        <FieldError id="contact-message-error" message={errorFor('message')} />
      </div>

      {/* Honeypot. Off-screen rather than display:none — a bot that reads styles
          skips hidden fields, but happily fills one it can "see". Sent to the
          server and IGNORED there for now; the check is deferred, not silent. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] size-px overflow-hidden"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          type="text"
          id="contact-website"
          name="_website"
          value={values._website}
          onChange={(event) => setField('_website', event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-4.5 flex items-start gap-2.5 text-[0.88rem] text-dim">
        <input
          type="checkbox"
          id="contact-resume"
          name="requestResume"
          checked={values.requestResume}
          onChange={(event) => setField('requestResume', event.target.checked)}
          className="mt-0.75 size-4 shrink-0 accent-accent"
        />
        <label htmlFor="contact-resume" className="cursor-pointer">
          Send me the resume PDF
        </label>
      </div>

      <div className="mt-3.5 flex items-start gap-2.5 text-[0.88rem] text-dim">
        <input
          type="checkbox"
          id="contact-consent"
          name="consent"
          checked={values.consent}
          onChange={(event) => setField('consent', event.target.checked)}
          onBlur={() => setTouched((t) => ({ ...t, consent: true }))}
          aria-invalid={errorFor('consent') !== undefined}
          aria-describedby={
            errorFor('consent') ? 'contact-consent-error' : undefined
          }
          className="mt-0.75 size-4 shrink-0 accent-accent"
        />
        <label htmlFor="contact-consent" className="cursor-pointer">
          I consent to my details being used to respond to this enquiry.
          <Required />{' · '}
          <Link href="/privacy" className="text-accent hover:underline">
            What I do with them
          </Link>
        </label>
      </div>
      <FieldError id="contact-consent-error" message={errorFor('consent')} />

      <button
        type="submit"
        disabled={busy}
        className="mt-5.5 flex w-full items-center justify-center gap-2.5 rounded-lg bg-accent px-5 py-3 font-semibold text-accent-ink transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink"
          />
        )}
        {busy ? 'Sending…' : 'Send & get the resume'}
      </button>

      {/* One live region for submit-level outcome. Field errors announce through
          their own aria-describedby association, not through here. */}
      <div role="status" aria-live="polite" className="sr-only">
        {busy ? 'Sending your request.' : ''}
      </div>

      {status === 'error' && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber/40 bg-amber/8 px-4 py-3 text-[0.87rem] text-dim"
        >
          <strong className="font-semibold text-amber">
            That did not go through.
          </strong>{' '}
          Nothing was sent, and nothing about your message is lost — email me
          directly at{' '}
          <a
            href={`mailto:${profile.email}?subject=${encodeURIComponent(
              'Resume request',
            )}&body=${encodeURIComponent(values.message)}`}
            className="text-accent hover:underline"
          >
            {profile.email}
          </a>{' '}
          and I will send the PDF by hand.
        </div>
      )}

      <p className="mt-3.5 text-center text-[0.78rem] text-dimmer">
        Four fields, one email. I do not add anyone to a list.
      </p>
    </form>
  );
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[0.85rem] font-semibold"
    >
      {children}
    </label>
  );
}

function Required() {
  return (
    <span className="text-accent" aria-hidden="true">
      *
    </span>
  );
}

/**
 * Renders nothing when there is no error, so the `aria-describedby` on the input
 * never points at an empty element — a dangling reference reads as an unlabelled
 * description in some screen readers.
 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (message === undefined) return null;

  return (
    <p id={id} className="mt-1.5 text-[0.8rem] text-amber">
      {message}
    </p>
  );
}

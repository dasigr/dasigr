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
 * Four details in here are the contract rather than styling:
 *   - the resume checkbox is CHECKED by default, consent is NOT (FR-6 / §9.5);
 *   - `_website` is a honeypot and it is live: the route drops any submission that
 *     comes back with it filled, answering with a body identical to a success (§8).
 *     It must therefore stay empty, stay out of the tab order, and stay unlabelled
 *     to assistive tech — a sighted or screen-reader user who fills it loses their
 *     message with a confirmation on screen;
 *   - the Turnstile widget is rendered EXPLICITLY and its id is retained, because
 *     tokens are single-use and this form survives every failure with its values
 *     intact. See the widget effect below;
 *   - client validation is UX only. `parseContact` runs again in the route handler
 *     and that run is the control (§8).
 *
 * The site key is read from `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` inline here
 * rather than through a shared module, deliberately: `src/lib/turnstile.ts` reads the
 * SECRET, and the absence of an import edge between the two files is what guarantees
 * it can never be dragged into this bundle.
 */

// `FormEvent` is deprecated in the React 19 types ("doesn't actually exist") —
// `SubmitEvent` is what `onSubmit` is actually declared against.
import Link from 'next/link';
import Script from 'next/script';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SubmitEvent,
} from 'react';

import { profile } from '@/content/profile';
import {
  CONTACT_LIMITS,
  parseContact,
  type ContactFieldErrors,
} from '@/lib/contact-schema';

/**
 * The slice of Cloudflare's `api.js` global this form uses. Declared locally rather
 * than pulled from a package — the script is loaded from Cloudflare's CDN, so a
 * dependency would only be types, and typing four methods is cheaper than a package
 * on a page with a First Load JS budget.
 */
interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'compact' | 'flexible';
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Must equal `TURNSTILE_ACTION` in src/lib/turnstile.ts. The route compares them. */
const TURNSTILE_ACTION = 'contact';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * `render=explicit` because implicit rendering (`class="cf-turnstile"`) gives back no
 * widget id, and without an id there is no `reset`. See the widget effect for why
 * this form cannot do without one.
 */
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** How often, and for how long, to look for `window.turnstile`. See the effect. */
const TURNSTILE_POLL_MS = 100;
const TURNSTILE_POLL_TIMEOUT_MS = 15_000;

/**
 * `error` is the generic failure (500, offline, an unrenderable 400). `forbidden` is
 * §8's 403 and is kept distinct on purpose: the generic copy says "that did not go
 * through, email me directly", which is right for a server fault and misleading for a
 * challenge the reader can simply retry.
 */
type Status = 'idle' | 'submitting' | 'success' | 'error' | 'forbidden';

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
const RENDERED_ERROR_FIELDS = [
  'name',
  'email',
  'company',
  'message',
  'consent',
  'captchaToken',
];

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-bg-alt px-3.5 py-2.5 text-[0.92rem] placeholder:text-[#5f7686] focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none aria-[invalid=true]:border-amber';

export function ContactForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<ContactFieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [sentTo, setSentTo] = useState('');
  const [resumeSent, setResumeSent] = useState(true);

  /**
   * The Turnstile token lives outside `values` on purpose. It is not a field the user
   * edits, it must not be validated by `parseContact` on every keystroke, and it has a
   * lifecycle — issued, spent, expired — that the other six values do not.
   */
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState<string>();
  const [scriptReady, setScriptReady] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>(undefined);

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

  /**
   * Waits for `window.turnstile.render` to exist, by polling.
   *
   * ⚠️ POLLING IS THE FIX, NOT LAZINESS. The obvious approach — `?onload=` on the
   * api.js URL, or next/script's `onReady` — is a race, and it was observed losing:
   * api.js calls its `onload` global the moment it initialises, which can be before
   * React has assigned that global, and `onReady` can fire before api.js has finished
   * defining `window.turnstile`. Either way the widget silently never renders and the
   * form 403s every submission with nothing on screen to explain it. A poll asks the
   * only question that matters — "is the function I am about to call there yet?" — and
   * cannot be beaten to it.
   *
   * It gives up after 15s and says so, because a widget that will never arrive must
   * not leave the reader pressing Send against a blank space.
   */
  useEffect(() => {
    // No synchronous fast path even when api.js is already there: setState inside an
    // effect body triggers a cascading render (react-hooks/set-state-in-effect), and
    // the first tick 100ms later costs nothing a reader can perceive.
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.turnstile?.render) {
        window.clearInterval(timer);
        setScriptReady(true);
        return;
      }
      if (Date.now() - startedAt > TURNSTILE_POLL_TIMEOUT_MS) {
        window.clearInterval(timer);
        setCaptchaError(
          'Verification could not load. Please retry, or email me directly below.',
        );
      }
    }, TURNSTILE_POLL_MS);

    return () => window.clearInterval(timer);
  }, []);

  /**
   * Renders the widget once, and only once, keeping its id.
   *
   * ⚠️ EXPLICIT RENDER IS THE REQUIREMENT, not a preference. A Turnstile token is
   * redeemed exactly once at siteverify, and this form stays mounted after every
   * outcome except success — 400, 403, 500 and the offline path all keep it on screen
   * with the reader's values intact, which is FR-6's "the lead is never lost"
   * behaviour. Resubmitting with a spent token yields `timeout-or-duplicate` and a 403
   * nobody can explain, so the widget must be resettable, and `reset` needs an id that
   * only `render` hands back.
   *
   * The effect depends on `scriptReady` alone. React Compiler is on; do not wrap the
   * callbacks below in `useCallback` to "stabilise" them — they are read once, at
   * render time, by a non-React library.
   */
  useEffect(() => {
    if (!scriptReady || !TURNSTILE_SITE_KEY) return;
    if (widgetIdRef.current !== undefined) return;
    if (!widgetRef.current || !window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(widgetRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION,
      // The site is dark-mode-first (CLAUDE.md). 'auto' would follow the OS, which
      // the rest of the page does not, and a light widget on this surface is jarring.
      theme: 'dark',
      // Fills the container rather than insisting on 300px. The form is 390px wide
      // inside p-7 padding at the mobile breakpoint, and §9 forbids horizontal
      // overflow; scaling with a CSS transform would blur the iframe instead.
      size: 'flexible',
      callback: (token) => {
        setCaptchaToken(token);
        setCaptchaError(undefined);
      },
      // Tokens expire roughly five minutes after they are issued. The reader this
      // catches is the one who opens the page, writes three careful paragraphs, and
      // then submits — without this they get a 403 for having taken their time.
      'expired-callback': () => {
        setCaptchaToken('');
        setCaptchaError('Verification expired. Please complete it again.');
      },
      'error-callback': () => {
        setCaptchaToken('');
        setCaptchaError(
          'Verification could not load. Please retry, or email me directly below.',
        );
      },
    });

    // Reads the ref rather than closing over the id, so a teardown that already ran
    // (the success path below) is not repeated here against a dead id.
    return () => {
      const widgetId = widgetIdRef.current;
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
      widgetIdRef.current = undefined;
    };
  }, [scriptReady]);

  /**
   * Called after every completed request that leaves the form on screen. A token is
   * spent whether the response was 200, 400, 403 or 500 — reusing it is a guaranteed
   * 403 on the next attempt.
   */
  const resetCaptcha = () => {
    setCaptchaToken('');
    if (widgetIdRef.current !== undefined) {
      window.turnstile?.reset(widgetIdRef.current);
    }
  };

  /**
   * Destroys the widget while its container is still in the document.
   *
   * ⚠️ THE TIMING IS THE POINT. Success replaces the whole form, and React detaches
   * that subtree before this component's passive effect cleanup runs — so by the time
   * the cleanup could call `remove()`, Turnstile's DOM is already gone and Cloudflare
   * logs "Cannot find Widget … consider using turnstile.remove()". That warning is
   * Cloudflare telling us its widget vanished without being torn down properly, so
   * the fix is to tear it down BEFORE the unmount, not to guard the cleanup after it.
   * Observed in the dev console, twice, before this existed.
   */
  const teardownCaptcha = () => {
    setCaptchaToken('');
    if (widgetIdRef.current !== undefined) {
      window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
    }
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

    /**
     * No token, no request. The route would answer 403 either way, but that costs a
     * round-trip to tell the reader something the page already knows, and it burns the
     * 403 copy on a case that is not a failure — it is a step not yet taken.
     *
     * The submit button stays ENABLED throughout. A disabled button with no stated
     * cause is worse than a message: it leaves a recruiter clicking at nothing.
     */
    if (captchaToken === '') {
      setCaptchaError(
        scriptReady
          ? // No "above" or "below": this message renders directly underneath the
            // widget, so a direction would point the reader the wrong way.
            'Please complete the verification to send.'
          : 'Verification is still loading — give it a moment and try again.',
      );
      setStatus('idle');
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, captchaToken }),
      });
      const body = await response.json();

      // §8's 403. Its own branch because the generic error copy blames the server,
      // and here the reader can simply solve the challenge again.
      if (response.status === 403) {
        resetCaptcha();
        setCaptchaError(
          'Verification failed. Please complete the challenge again.',
        );
        setStatus('forbidden');
        return;
      }

      if (response.status === 400 && body?.errors) {
        resetCaptcha();
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
        resetCaptcha();
        setStatus('error');
        return;
      }

      /**
       * ⚠️ TEARDOWN, NOT RESET. Success replaces the form, so there is nothing left to
       * resubmit and a fresh challenge would be pure waste — and `reset()` here starts
       * one that the imminent unmount then destroys mid-flight. `teardownCaptcha`
       * also has to run BEFORE `setStatus('success')`, which is the line that
       * unmounts the container; see its comment.
       */
      teardownCaptcha();
      setSentTo(values.email.trim());
      setResumeSent(body.resumeSent === true);
      setStatus('success');
    } catch {
      // Offline, DNS, aborted — indistinguishable from here and handled the same:
      // show the mailto: fallback rather than swallowing the lead (FR-7a).
      // The token may or may not have been spent; assume it was.
      resetCaptcha();
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

      {/* Honeypot, and it is armed: a filled `_website` makes the route discard the
          submission and answer as though it had sent it (§8). Off-screen rather than
          display:none — a bot that reads styles skips hidden fields, but happily
          fills one it can "see". `aria-hidden` plus `tabIndex={-1}` plus
          `autoComplete="off"` are what keep a real person from ever reaching it. */}
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

      {/* Turnstile. `lazyOnload` keeps api.js off the critical path — this is a
          single-page site, so the form is in the initial DOM for every visitor, but
          the challenge is not needed until someone intends to submit. The script is
          third party, so it does not appear in `next build`'s First Load JS figure;
          that is not the same as free, and its transfer size is worth watching.

          ⚠️ The `onload` handler is named on the script URL (see TURNSTILE_SCRIPT_SRC)
          rather than relying on next/script's `onReady`, because api.js finishes
          loading and finishes initialising `window.turnstile` at different moments. */}
      <Script
        id="cf-turnstile"
        src={TURNSTILE_SCRIPT_SRC}
        strategy="lazyOnload"
      />

      <div className="mt-5">
        <div ref={widgetRef} />
        {!TURNSTILE_SITE_KEY && (
          // Configuration failure, and it is loud on purpose: without a site key the
          // widget never renders, the route 403s every submission, and the only clue
          // otherwise would be a server log nobody is reading.
          <p className="mt-2 text-[0.8rem] text-amber">
            Verification is not configured
            (NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing). Please email me directly.
          </p>
        )}
        <FieldError id="contact-captcha-error" message={captchaError} />
      </div>

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

      {/* §8's 403 gets its own copy. The generic message below blames the server,
          which is right for a 500 and misleading here: the usual cause is a challenge
          that needs solving again. The mailto: fallback stays visible regardless —
          if Turnstile is blocked on the reader's network, retrying will never work,
          and FR-7a rates a silently lost lead worse than no gate at all. */}
      {status === 'forbidden' && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber/40 bg-amber/8 px-4 py-3 text-[0.87rem] text-dim"
        >
          <strong className="font-semibold text-amber">
            Verification failed.
          </strong>{' '}
          Nothing was sent. Please complete the challenge above and send again —
          or, if it will not load, email me at{' '}
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

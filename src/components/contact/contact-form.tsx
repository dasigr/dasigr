/**
 * FR-6 form — PRESENTATIONAL ONLY IN THIS FEATURE.
 *
 * Nothing submits: no `action`, no `onSubmit`, and the button is `type="button"` so
 * it cannot even trigger a native GET. That is deliberate and is what keeps this a
 * Server Component with zero client JS.
 *
 * When the real thing lands, three details in this markup are the actual contract:
 *   - the resume checkbox is CHECKED by default, the consent checkbox is NOT (§FR-6);
 *   - `_website` is the honeypot, and its rejection response must be byte-identical
 *     to a success or the bot learns it was caught (§8);
 *   - client validation is UX only. The Zod schema in src/lib is the control, and the
 *     route handler is where it counts.
 */

interface ContactFormProps {
  /** Rendered under the button while submission is not wired up. */
  disabledNote: string;
}

export function ContactForm({ disabledNote }: ContactFormProps) {
  return (
    <form
      className="rounded-xl border border-line-soft bg-surface p-7"
      aria-label="Contact and resume request"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="mb-4.5 sm:mb-0">
          <label
            htmlFor="contact-name"
            className="mb-1.5 block text-[0.85rem] font-semibold"
          >
            Name <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            id="contact-name"
            name="name"
            placeholder="Jane Recruiter"
            autoComplete="name"
            className="w-full rounded-lg border border-line bg-bg-alt px-3.5 py-2.5 text-[0.92rem] placeholder:text-[#5f7686] focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="mb-1.5 block text-[0.85rem] font-semibold"
          >
            Email <span className="text-accent">*</span>
          </label>
          <input
            type="email"
            id="contact-email"
            name="email"
            placeholder="jane@example.com"
            autoComplete="email"
            className="w-full rounded-lg border border-line bg-bg-alt px-3.5 py-2.5 text-[0.92rem] placeholder:text-[#5f7686] focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4.5">
        <label
          htmlFor="contact-company"
          className="mb-1.5 block text-[0.85rem] font-semibold"
        >
          Company{' '}
          <span className="text-[0.78rem] font-normal text-dimmer">
            — optional
          </span>
        </label>
        <input
          type="text"
          id="contact-company"
          name="company"
          placeholder="Acme Corp"
          autoComplete="organization"
          className="w-full rounded-lg border border-line bg-bg-alt px-3.5 py-2.5 text-[0.92rem] placeholder:text-[#5f7686] focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none"
        />
      </div>

      <div className="mt-4.5">
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-[0.85rem] font-semibold"
        >
          Message <span className="text-accent">*</span>{' '}
          <span className="text-[0.78rem] font-normal text-dimmer">
            — 10–2000 characters
          </span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          placeholder="A little about the role or the project…"
          className="min-h-32.5 w-full resize-y rounded-lg border border-line bg-bg-alt px-3.5 py-2.5 text-[0.92rem] placeholder:text-[#5f7686] focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none"
        />
      </div>

      {/* Honeypot. Off-screen rather than display:none — a bot that reads styles
          skips hidden fields, but happily fills one it can "see". */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] size-px overflow-hidden"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          type="text"
          id="contact-website"
          name="_website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-4.5 flex items-start gap-2.5 text-[0.88rem] text-dim">
        <input
          type="checkbox"
          id="contact-resume"
          name="requestResume"
          defaultChecked
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
          className="mt-0.75 size-4 shrink-0 accent-accent"
        />
        <label htmlFor="contact-consent" className="cursor-pointer">
          I consent to my details being used to respond to this enquiry.{' '}
          <span className="text-accent">*</span>
        </label>
      </div>

      <p className="my-4.5 rounded-lg border border-dashed border-line px-3 py-2.5 font-mono text-[0.72rem] text-dimmer">
        Bot check mounts here — invisible, no interaction required.
      </p>

      <button
        type="button"
        aria-disabled="true"
        className="w-full justify-center rounded-lg bg-accent px-5 py-3 font-semibold text-accent-ink"
      >
        Send &amp; get the resume
      </button>
      <p className="mt-3.5 text-center text-[0.78rem] text-dimmer">
        {disabledNote}
      </p>
    </form>
  );
}

/**
 * src/lib/spam.ts
 *
 * The honeypot decision for `POST /api/contact` — §8's third spam control. Cloudflare
 * Turnstile (403) now runs ahead of it in the route; the Upstash rate limit (429) is
 * still deferred. Nothing here knows about either, and that is deliberate: this
 * module's whole job is the §8 parity below, and coupling it to another control is
 * how that parity acquires a second way to break.
 *
 * Note what Turnstile did to this control's reach rather than to its code: a bot
 * without a solved token never gets past the 403, so the honeypot is now rarely the
 * thing that catches anything. It stays because it is free, because it catches the
 * naive browser-driving bot that solves the challenge and then fills every input, and
 * because its tests are what keep §8's identical-response rule honest.
 *
 * WHY THIS IS A MODULE AND NOT TWO LINES IN THE ROUTE: §8's requirement is not
 * "drop the submission", it is "drop it and answer exactly as if you had not".
 * That second half is invisible at a glance and silently breakable by any later
 * edit to the route's success path, so the decision and the response it implies are
 * one function with tests asserting the parity. The route never re-derives
 * `resumeSent` for the rejected branch — it reads it from the disposition and
 * returns through the same helper the real path uses.
 *
 * Kept free of Node imports so nothing stops the route from moving runtimes later,
 * and free of the schema so a change to one cannot quietly redefine the other.
 */

/**
 * What the route should do with a submission that has already passed validation.
 *
 * `resumeSent` is what the response body must report **on either branch**. It is the
 * submitter's own `requestResume` value, deliberately, including when the honeypot
 * tripped: §8's success body varies (`true` when the resume box was ticked, `false`
 * when it was not), so a rejection that always claimed `true` would be a tell to any
 * bot that submits with the box unticked.
 */
export interface ContactDisposition {
  /** `false` means: send nothing, read nothing, and answer as though you had. */
  readonly deliver: boolean;
  /** The `resumeSent` value for the §8 200 body. Identical on both branches. */
  readonly resumeSent: boolean;
}

/** What `decideContactDelivery` needs. A subset of the parsed submission. */
interface HoneypotCandidate {
  readonly requestResume: boolean;
  readonly _website?: string;
}

/**
 * True when the off-screen `_website` input came back with something in it.
 *
 * Whitespace does not count. A password manager or an over-eager autofill can put a
 * space into a field the human never saw, and a false positive here is a recruiter
 * lead that vanishes with a success message on screen — the silent loss FR-7a calls
 * worse than having no gate at all. Undefined is not a trip either: the field is
 * `z.optional()` in the schema, so a submission from a non-browser client that omits
 * it entirely is untidy, not hostile, and this control is not the one that decides
 * what to do about that.
 */
export function isHoneypotTripped(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * The single decision. Call it after validation and before anything expensive —
 * before the PDF is read and before Resend is constructed — so a caught bot costs a
 * parse and nothing else.
 *
 * On ordering: §8's FR-7 diagram puts the honeypot after the Zod check, and that is
 * also the order that leaks least. Running the honeypot first would mean a bot that
 * sends garbage learns something — `400` with the field empty, `200` with it filled,
 * same broken payload. Validating first removes that: the honeypot value changes the
 * response for no input at all.
 */
export function decideContactDelivery(
  submission: HoneypotCandidate,
): ContactDisposition {
  return {
    deliver: !isHoneypotTripped(submission._website),
    resumeSent: submission.requestResume,
  };
}

/**
 * A short, bounded rendering of what was in the honeypot, for the server log only.
 *
 * The field has no `maxLength` in the schema (the 10 KB payload cap is its only
 * bound), and the reason to log it at all is to tell spam apart from an autofill
 * accident if leads ever stop arriving — which the first few characters answer.
 */
export function describeHoneypotValue(value: string | undefined | null): string {
  if (typeof value !== 'string') return '(absent)';

  const trimmed = value.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

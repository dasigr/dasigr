/**
 * src/lib/contact-schema.ts
 *
 * The single schema §8 requires: imported by `ContactForm` (a Client Component) and
 * by `POST /api/contact`. Client validation is UX; the server copy is the control.
 *
 * ⚠️ WRITTEN AGAINST `zod/mini`, NOT `zod`. The functional `.check(...)` style below
 * is uglier than `z.string().trim().min(2)` and it is not a preference. Because this
 * file is imported by a Client Component, whatever it imports ships to the browser,
 * and the classic `z` namespace does not tree-shake: it measured **+69 KB gzipped**
 * on `/`, against a budget of 120 KB that the framework floor already exceeds.
 * `zod/mini` is the same validator with the same error objects at a fraction of that.
 * If you find yourself reaching for a chained method here, measure before you switch.
 *
 * MUST STAY FREE OF NODE IMPORTS for the same reason — one `node:fs` and the client
 * bundle breaks, leaving the two-sided validation quietly one-sided.
 *
 * Field names and messages mirror the FR-6 table and the §8 error body verbatim.
 */

import * as z from 'zod/mini';

/** FR-6's boundaries, named so the tests assert against the requirement not a literal. */
export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  companyMax: 100,
  messageMin: 10,
  messageMax: 2000,
  /** §8 payload cap. Enforced on the raw body by the route, not by this schema. */
  payloadBytes: 10_240,
} as const;

export const contactSchema = z.object({
  // z.trim() first: a name of eight spaces must fail the minimum, not pass it.
  name: z
    .string({ error: 'Name is required' })
    .check(
      z.trim(),
      z.minLength(CONTACT_LIMITS.nameMin, {
        error: 'Name must be at least 2 characters',
      }),
      z.maxLength(CONTACT_LIMITS.nameMax, {
        error: 'Name must be 100 characters or fewer',
      }),
    ),

  // §8 says RFC 5322. Zod's default email regex is deliberately stricter than the
  // RFC; naming the pattern makes the choice traceable to the spec line.
  email: z
    .email({ error: 'Invalid email address', pattern: z.regexes.rfc5322Email })
    .check(z.maxLength(254, { error: 'Invalid email address' })),

  company: z.optional(
    z
      .string()
      .check(
        z.trim(),
        z.maxLength(CONTACT_LIMITS.companyMax, {
          error: 'Company must be 100 characters or fewer',
        }),
      ),
  ),

  message: z
    .string({ error: 'Message is required' })
    .check(
      z.trim(),
      z.minLength(CONTACT_LIMITS.messageMin, {
        error: 'Message must be at least 10 characters',
      }),
      z.maxLength(CONTACT_LIMITS.messageMax, {
        error: 'Message must be 2000 characters or fewer',
      }),
    ),

  requestResume: z.boolean(),

  // Unchecked by default in the markup (§9.5 — consent must be an act, not a
  // default), so `false` is the common case and has to fail rather than coerce.
  consent: z.literal(true, {
    error: 'Consent is required before I can reply',
  }),

  /**
   * Honeypot. Accepted and IGNORED — the rejection is not implemented in this
   * feature (see context/current-feature.md). It is typed as an optional string
   * rather than `maxLength(0)` on purpose: rejecting a filled honeypot with a 400
   * would be its own tell, and §8's requirement is that a caught bot sees a
   * response identical to success.
   */
  _website: z.optional(z.string()),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** The §8 400 body: one message per field, first failure wins. */
export type ContactFieldErrors = Partial<
  Record<keyof ContactInput | 'form', string>
>;

export type ContactParseResult =
  | { success: true; data: ContactInput }
  | { success: false; errors: ContactFieldErrors };

/**
 * Collapses a ZodError into `{ email: "Invalid email address" }`.
 *
 * First issue per field, because the form shows one message under each input and
 * §8's example body is a flat string map. An issue with an empty path (a
 * whole-object refinement) lands under `form` rather than being dropped — silently
 * losing an error is how a form ends up rejecting with nothing shown.
 */
export function toFieldErrors(error: z.core.$ZodError): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  for (const issue of error.issues) {
    const key = (issue.path[0] as keyof ContactInput | undefined) ?? 'form';
    if (errors[key] === undefined) errors[key] = issue.message;
  }

  return errors;
}

/**
 * The one entry point both sides call. Returning a discriminated union rather than
 * throwing keeps the route handler and the form on the same branch shape.
 */
export function parseContact(input: unknown): ContactParseResult {
  const result = contactSchema.safeParse(input);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: toFieldErrors(result.error) };
}

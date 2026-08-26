/**
 * POST /api/contact — FR-7. The only route by which the resume PDF leaves this app.
 *
 * Implements the §8 contract for the outcomes this feature covers: 200 (sent),
 * 200 (resume box unticked), 400 (validation), 500 (provider or filesystem).
 * 403 and 429 are reserved and unused — Turnstile and the Upstash rate limit are
 * deliberately deferred (see context/current-feature.md).
 *
 * ⚠️ THIS ROUTE HAS NO SPAM PROTECTION. Anything that can POST JSON can make it
 * send mail. The exposure is the Resend quota and sender reputation, not the PDF,
 * which is forwardable by design (FR-7a). Turnstile is the next feature.
 *
 * Chosen as a Route Handler rather than a Server Action because §8 specifies exact
 * status codes and FR-7's sequence diagram is written against HTTP. A Server Action
 * cannot express 403/429 as status codes without contorting the return type, and
 * those rows are reserved even though nothing returns them yet.
 */

import { Resend } from 'resend';

import {
  buildOwnerEmail,
  buildRequesterEmail,
  RESUME_ATTACHMENT_FILENAME,
  type ContactSubmission,
} from '@/lib/contact-email';
import { CONTACT_LIMITS, parseContact } from '@/lib/contact-schema';
import { readResumeFile, resumeExists } from '@/lib/resume';
import { profile } from '@/content/profile';

/**
 * Mandatory per FR-7 — the Edge runtime cannot read from the filesystem and the
 * resume deliberately does not live in public/. Next 16 already defaults to
 * 'nodejs' and deprecates 'edge'; this stays explicit because the constraint is a
 * requirement of the feature, not a preference that a future default can revisit.
 */
export const runtime = 'nodejs';

/**
 * Two awaited Resend calls, one carrying a ~150 KB attachment. The platform default
 * is tight enough that a slow provider turns a captured lead into a 504, and a 504
 * is the silent-failure FR-7a calls worse than no gate at all.
 */
export const maxDuration = 30;

/** §8. Every response body in this file is one of these, and nothing else. */
const RESPONSES = {
  validation: (errors: Record<string, string>) =>
    Response.json({ success: false, errors }, { status: 400 }),
  failure: () =>
    Response.json(
      { success: false, error: 'Unable to send. Please email directly.' },
      { status: 500 },
    ),
  accepted: (resumeSent: boolean) =>
    Response.json({ success: true, resumeSent }, { status: 200 }),
} as const;

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();

  // §8 payload cap. Checked before reading the body so an oversized request costs
  // a header read rather than 10 MB of memory. Content-Length is trivially lied
  // about, but this is a robustness guard, not the missing spam control.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > CONTACT_LIMITS.payloadBytes) {
    return RESPONSES.validation({ message: 'Submission is too large.' });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return RESPONSES.validation({ form: 'Could not read the submission.' });
  }

  // The control. The form ran this same schema, and that run does not count.
  const parsed = parseContact(payload);
  if (!parsed.success) {
    return RESPONSES.validation(parsed.errors as Record<string, string>);
  }

  const submission: ContactSubmission = {
    ...parsed.data,
    referrer: request.headers.get('referer'),
    submittedAt: new Date(),
  };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error(
      '[contact] RESEND_API_KEY or EMAIL_FROM is not set — nothing was sent.',
    );
    return RESPONSES.failure();
  }

  /**
   * Where the lead notification lands. Defaults to the address on the page, which
   * is the right answer in production; `EMAIL_TO` exists so a preview deployment
   * or a local run can be verified without mailing the real inbox — and because
   * Resend's sandbox sender will only deliver to the account's own address.
   */
  const owner = process.env.EMAIL_TO ?? profile.email;

  // Read before sending anything. A missing PDF must not produce a lead
  // notification claiming a resume went out when none did.
  let resume: Buffer | undefined;
  if (submission.requestResume) {
    if (!resumeExists()) {
      console.error(
        `[contact] Resume missing at private/${RESUME_ATTACHMENT_FILENAME}. ` +
          'In production this means outputFileTracingIncludes did not ship it.',
      );
      return RESPONSES.failure();
    }
    resume = readResumeFile();
  }

  const resend = new Resend(apiKey);
  const requesterEmail = buildRequesterEmail(submission);
  const ownerEmail = buildOwnerEmail(submission);

  // Both sends are attempted even if the first fails — allSettled, not all. If the
  // requester's copy bounces, the owner still gets the lead and can reply by hand,
  // which is the difference between a degraded request and a lost one.
  const sends = await Promise.allSettled([
    submission.requestResume && resume
      ? resend.emails.send({
          from,
          to: submission.email,
          subject: requesterEmail.subject,
          html: requesterEmail.html,
          text: requesterEmail.text,
          replyTo: profile.email,
          attachments: [
            { filename: RESUME_ATTACHMENT_FILENAME, content: resume },
          ],
        })
      : Promise.resolve({ data: null, error: null }),
    resend.emails.send({
      from,
      to: owner,
      subject: ownerEmail.subject,
      html: ownerEmail.html,
      text: ownerEmail.text,
      // G-5: the owner replies to the recruiter, not to the sending domain.
      replyTo: ownerEmail.replyTo,
    }),
  ]);

  // Resend reports provider errors in the resolved value, not by rejecting, so a
  // settled promise is not the same as a delivered email.
  const failures = sends.filter(
    (result) =>
      result.status === 'rejected' ||
      (result.status === 'fulfilled' && result.value.error !== null),
  );

  const elapsedMs = Date.now() - startedAt;

  if (failures.length > 0) {
    console.error('[contact] Send failed after %dms', elapsedMs, failures);
    return RESPONSES.failure();
  }

  console.info(
    '[contact] Lead from %s in %dms (resume: %s)',
    submission.email,
    elapsedMs,
    submission.requestResume,
  );

  return RESPONSES.accepted(submission.requestResume);
}

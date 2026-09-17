/**
 * POST /api/contact — FR-7. The only route by which the resume PDF leaves this app.
 *
 * Implements the §8 contract for the outcomes this feature covers: 200 (sent),
 * 200 (resume box unticked), 200 (honeypot tripped — identical body, nothing sent),
 * 400 (validation), 403 (Turnstile), 500 (provider or filesystem). 429 is still
 * reserved and unused — the Upstash rate limit is the remaining spam control (see
 * context/current-feature.md).
 *
 * TWO SPAM CONTROLS RUN HERE, in FR-7's order: Cloudflare Turnstile, then the
 * `_website` honeypot. Turnstile is what stops the script that posts JSON directly;
 * the honeypot is defence in depth and is now rarely reached by anything hostile,
 * since a bot without a solved token never gets past the 403.
 *
 * ⚠️ STILL MISSING: the per-IP rate limit. A holder of one valid token cannot replay
 * it (siteverify redeems it once), but nothing here caps how many challenges a
 * determined solver may work through. The exposure that leaves is the Resend quota
 * and sender reputation, not the PDF, which is forwardable by design (FR-7a).
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
import { decideContactDelivery, describeHoneypotValue } from '@/lib/spam';
import {
  clientIpFromForwardedFor,
  describeVerifyFailure,
  isPlausibleToken,
  isVerificationAcceptable,
  parseExpectedHostnames,
  TURNSTILE_ACTION,
  verifyTurnstileToken,
} from '@/lib/turnstile';
import { profile } from '@/content/profile';

/**
 * Mandatory per FR-7 — the Edge runtime cannot read from the filesystem and the
 * resume deliberately does not live in public/. Next 16 already defaults to
 * 'nodejs' and deprecates 'edge'; this stays explicit because the constraint is a
 * requirement of the feature, not a preference that a future default can revisit.
 */
export const runtime = 'nodejs';

/**
 * Two awaited Resend calls, one carrying a ~150 KB attachment, now behind a Turnstile
 * round-trip capped at 10s by its own AbortSignal. The platform default is tight
 * enough that a slow provider turns a captured lead into a 504, and a 504 is the
 * silent-failure FR-7a calls worse than no gate at all.
 */
export const maxDuration = 30;

/** §8. Every response body in this file is one of these, and nothing else. */
const RESPONSES = {
  validation: (errors: Record<string, string>) =>
    Response.json({ success: false, errors }, { status: 400 }),
  /**
   * §8's 403. Deliberately says nothing about WHY — an unsolved challenge, a spent
   * token, a wrong hostname and an unset secret all leave through this one line, so a
   * bot probing the gate learns which of its attempts failed and nothing about how.
   * The diagnosis goes to the server log instead (`describeVerifyFailure`).
   */
  forbidden: () =>
    Response.json(
      { success: false, error: 'Captcha verification failed' },
      { status: 403 },
    ),
  failure: () =>
    Response.json(
      { success: false, error: 'Unable to send. Please email directly.' },
      { status: 500 },
    ),
  /**
   * The ONLY 200 in this file, and it has to stay that way. A caught bot and a
   * delivered lead both leave through this line, which is what makes §8's
   * "the response must not differ" structural rather than a promise in a comment.
   */
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

  /**
   * ── Turnstile ────────────────────────────────────────────────────────────────
   *
   * FR-7's order: after Zod, before the honeypot. After Zod for the same reason the
   * honeypot is — a malformed payload must get its 400 whatever the captcha says, or
   * the status code becomes a probe. Before the honeypot because FR-7's diagram says
   * so, and because there is no reason to spend the cheaper check first when the
   * expensive one is what a real attacker has to beat.
   *
   * ⚠️ EVERYTHING HERE FAILS CLOSED — missing secret, empty hostname allowlist,
   * unreachable siteverify, all 403 (owner's decision, 2026-09-17; the narrower
   * "fail open only when Cloudflare is down" variant was offered and declined). That
   * is only defensible because the loss is NOT silent: the form renders the 403 with
   * its `mailto:` fallback on screen, so a recruiter hitting a misconfigured gate can
   * still reach the owner. Fail open would mean a typo in an env var silently
   * disables the control with nothing visible anywhere.
   */
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const expectedHostnames = parseExpectedHostnames(
    process.env.TURNSTILE_HOSTNAMES,
  );

  if (!turnstileSecret || expectedHostnames.size === 0) {
    console.error(
      '[contact] TURNSTILE_SECRET_KEY or TURNSTILE_HOSTNAMES is not set — ' +
        'every submission is being rejected with a 403.',
    );
    return RESPONSES.forbidden();
  }

  // No round-trip for something that cannot be a token. Not a security check: the
  // only thing that decides a token is good is siteverify.
  if (!isPlausibleToken(parsed.data.captchaToken)) {
    console.info('[contact] No usable Turnstile token on the submission.');
    return RESPONSES.forbidden();
  }

  const verification = await verifyTurnstileToken({
    token: parsed.data.captchaToken,
    secret: turnstileSecret,
    // §8 names the same header for the rate limit that will follow.
    remoteIp: clientIpFromForwardedFor(request.headers.get('x-forwarded-for')),
  });

  if (
    verification === null ||
    !isVerificationAcceptable({
      result: verification,
      expectedAction: TURNSTILE_ACTION,
      expectedHostnames,
    })
  ) {
    console.warn(
      '[contact] Turnstile rejected a submission in %dms — %s',
      Date.now() - startedAt,
      describeVerifyFailure(verification),
    );
    return RESPONSES.forbidden();
  }

  /**
   * §8's silent bot rejection. After validation (§8's own order, and the order that
   * leaks least — see the note in spam.ts) but before anything that costs: no PDF
   * read, no Resend client, no mail. The one observable difference left is timing,
   * since this answers without two provider round-trips. That is a weak tell and the
   * cure — padding the response with fake latency — buys nothing against a bot that
   * is not timing us and costs a real recruiter nothing but the wait.
   *
   * Note `disposition.resumeSent`, not a fresh literal: the rejection reports what
   * the submitter asked for, through the same helper as a real send.
   *
   * Sitting above the env check and the PDF read does leave one differential: with
   * RESEND_API_KEY unset or the PDF missing from the bundle, a caught bot still gets
   * its 200 while a real submission gets a 500. Accepted knowingly — that state is
   * one where every legitimate lead is already being lost, and the alternative is
   * reading a 194 KB file off disk for every spam hit, which is the cost the
   * honeypot exists to avoid.
   */
  const disposition = decideContactDelivery(parsed.data);
  if (!disposition.deliver) {
    console.info(
      '[contact] Honeypot tripped by %s in %dms — nothing sent (_website: %s)',
      parsed.data.email,
      Date.now() - startedAt,
      describeHoneypotValue(parsed.data._website),
    );
    return RESPONSES.accepted(disposition.resumeSent);
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

  // Same value, same helper, same line of reasoning as the rejection above.
  return RESPONSES.accepted(disposition.resumeSent);
}

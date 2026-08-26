/**
 * src/lib/contact-email.ts
 *
 * Turns a validated submission into the two messages FR-7 describes. Pure — no
 * Resend import, no I/O — so the interesting decisions (what gets escaped, what is
 * never echoed, how the timestamp reads) are unit-testable without a network stub.
 *
 * Two §8 server rules live here rather than in the route:
 *   - every field is escaped before it reaches email HTML;
 *   - Email A never contains the submitted message. Echoing it back is a reflected
 *     content vector, and it reads oddly to a recruiter who just typed it.
 */

import { profile, socials } from '@/content/profile';

/** FR-7: the name the attachment arrives under, and the file's name on disk. */
export const RESUME_ATTACHMENT_FILENAME = 'romualdo-dasig-resume.pdf';

export interface ContactSubmission {
  name: string;
  email: string;
  company?: string;
  message: string;
  requestResume: boolean;
  /** `null` when the browser sent no Referer — a direct visit or a stripped header. */
  referrer: string | null;
  submittedAt: Date;
}

export interface EmailBody {
  subject: string;
  html: string;
  text: string;
}

/**
 * Escapes the five characters that can break out of HTML text or an attribute.
 * Applied to EVERY interpolated field — a recruiter's company name is attacker
 * input in exactly the same way a bot's is.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips CR, LF, and NUL from anything destined for a mail header (subject,
 * Reply-To). A newline in a header value is the classic injection: everything
 * after it is read as a new header. Collapses the resulting run of spaces so a
 * stripped name does not arrive with a hole in it.
 */
export function stripHeaderInjection(value: string): string {
  return value.replace(/[\r\n\0]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * FR-7 Email B carries an **Asia/Manila** timestamp — the owner's own clock, not
 * the server's region, which on Vercel is wherever the function happened to run.
 *
 * Built from `formatToParts` rather than a locale string so the layout is fixed by
 * this function instead of by whichever ICU build Node was compiled against.
 */
export function formatManilaTimestamp(date: Date): string {
  if (Number.isNaN(date.getTime())) return 'unknown time';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} (Asia/Manila, UTC+8)`;
}

/** "Acme Corp" or the placeholder — the field is optional and may arrive as "". */
export function displayCompany(company: string | undefined): string {
  const trimmed = company?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : 'no company given';
}

/** "https://linkedin.com/…" or the placeholder. Referer is absent more often than not. */
export function displayReferrer(referrer: string | null): string {
  const trimmed = referrer?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : 'direct — no referrer sent';
}

const linkedIn = socials.find((social) => social.label === 'LinkedIn');
const gitHub = socials.find((social) => social.label === 'GitHub');

/**
 * 📤 Email A — to the requester. Brief thank-you, the two profile links, the
 * portfolio URL, and the PDF attached by the caller.
 *
 * The only submitted field that appears is the name, in the greeting. That is the
 * deliberate limit of what gets reflected back.
 */
export function buildRequesterEmail(
  submission: Pick<ContactSubmission, 'name'>,
): EmailBody {
  const name = stripHeaderInjection(submission.name);
  const safeName = escapeHtml(name);

  const text = [
    `Hi ${name},`,
    '',
    'Thanks for getting in touch. My resume is attached as a PDF.',
    '',
    'Forward it wherever it is useful — it is not posted publicly, but it is not',
    'confidential either.',
    '',
    `Portfolio: ${profile.url}`,
    linkedIn ? `LinkedIn:  ${linkedIn.href}` : '',
    gitHub ? `GitHub:    ${gitHub.href}` : '',
    '',
    'I read every message that comes through the site and will reply properly soon.',
    '',
    profile.name,
    `${profile.title} · ${profile.location}`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16242f;">
      <p>Hi ${safeName},</p>
      <p>Thanks for getting in touch. My resume is attached as a PDF.</p>
      <p>Forward it wherever it is useful — it is not posted publicly, but it is not confidential either.</p>
      <p>
        <a href="${profile.url}">Portfolio</a>${
          linkedIn ? ` · <a href="${linkedIn.href}">LinkedIn</a>` : ''
        }${gitHub ? ` · <a href="${gitHub.href}">GitHub</a>` : ''}
      </p>
      <p>I read every message that comes through the site and will reply properly soon.</p>
      <p style="margin-bottom:0;"><strong>${escapeHtml(profile.name)}</strong><br />
      ${escapeHtml(profile.title)} · ${escapeHtml(profile.location)}</p>
    </div>
  `.trim();

  return {
    subject: `${profile.name} — ${profile.title} Resume`,
    html,
    text,
  };
}

/**
 * 📥 Email B — to the owner. Every field, the Manila timestamp, the referrer, and
 * whether the resume actually went out.
 *
 * `replyTo` is the point of this message: G-5 is not "know that someone asked", it
 * is being able to hit reply and have it reach them.
 */
export function buildOwnerEmail(
  submission: ContactSubmission,
): EmailBody & { replyTo: string } {
  const name = stripHeaderInjection(submission.name);
  const company = displayCompany(submission.company);
  const referrer = displayReferrer(submission.referrer);
  const timestamp = formatManilaTimestamp(submission.submittedAt);
  const resumeLine = submission.requestResume
    ? 'Yes — PDF attached to their copy'
    : 'No — they left the box unticked';

  const rows: Array<[string, string]> = [
    ['Name', name],
    ['Email', submission.email],
    ['Company', company],
    ['Resume requested', resumeLine],
    ['Received', timestamp],
    ['Referrer', referrer],
  ];

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Message:',
    submission.message,
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16242f;">
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${rows
          .map(
            ([label, value]) => `<tr>
          <td style="padding:4px 16px 4px 0;color:#7c93a3;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:4px 0;">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join('\n        ')}
      </table>
      <p style="color:#7c93a3;margin:0 0 6px;">Message</p>
      <div style="white-space:pre-wrap;border-left:3px solid #5ad1c0;padding-left:14px;">${escapeHtml(
        submission.message,
      )}</div>
    </div>
  `.trim();

  return {
    subject: stripHeaderInjection(
      `New portfolio inquiry from ${name} (${company})`,
    ),
    html,
    text,
    replyTo: stripHeaderInjection(submission.email),
  };
}

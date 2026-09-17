/**
 * src/lib/turnstile.ts
 *
 * Cloudflare Turnstile verification for `POST /api/contact` — §8's 403 row and the
 * `H->>T: verify captchaToken` leg of the FR-7 sequence. Follows the Turnstile Spin
 * existing-widget flow; the widget was created in the dashboard and this code never
 * creates, reads, or modifies a Cloudflare resource.
 *
 * ⚠️ SERVER ONLY. Never import this from `contact-form.tsx` or anything it reaches.
 * The site key is public and is read inline in the form; the secret read below is not,
 * and the import edge is the thing that keeps them apart. (Next replaces a
 * non-`NEXT_PUBLIC_` env reference with `undefined` in a client bundle rather than
 * inlining it, so the failure mode would be a silent always-403 rather than a leak —
 * which is worse to diagnose, not better.)
 *
 * WHY THIS IS A MODULE AND NOT A BLOCK IN THE ROUTE: the same reason as src/lib/spam.ts,
 * and more strongly. The decision has four conjuncts, three of them are easy to drop
 * without anything failing, and the route is the one file the Vitest glob cannot see
 * (`src/{actions,lib}/**​/*.test.ts`). The pure decision is separated from the network
 * call so the conjuncts can be pinned without stubbing fetch.
 *
 * Kept free of Node imports, like spam.ts, so nothing here decides the route's runtime.
 */

/** Cloudflare's endpoint. The only network destination this module talks to. */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * The surface's stable action, sent as `data-action` on the widget and compared
 * against siteverify's echo. Spin's constraint: 1–32 characters, letters, digits,
 * underscores and hyphens only.
 *
 * It exists so a token solved on some other Turnstile-protected surface — now or
 * later — cannot be replayed against this one.
 */
export const TURNSTILE_ACTION = 'contact';

/** Spin's cap. A token far over this is not a token, so do not spend a round-trip on it. */
const MAX_TOKEN_LENGTH = 2048;

/** How long to wait on siteverify before giving up. Spin's canonical value. */
const SITEVERIFY_TIMEOUT_MS = 10_000;

/**
 * siteverify's response, narrowed to the fields the decision reads. Cloudflare may add
 * fields; `isVerificationAcceptable` ignores what it does not name, which is why the
 * test asserting that an unknown extra field still passes is not busywork.
 */
export interface TurnstileVerifyResult {
  success: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Splits `TURNSTILE_HOSTNAMES` into the allowlist siteverify's `hostname` is checked
 * against. Empties and stray whitespace are dropped so a trailing comma cannot put `''`
 * into the set — an empty-string entry would never match a real hostname, but it would
 * make `size > 0` true and so quietly disarm the misconfiguration guard below.
 *
 * ⚠️ The value is DEPLOYMENT-SPECIFIC. Production must contain the production
 * hostnames and must NOT contain `localhost` or `127.0.0.1` — one widget registered for
 * both local and production domains is only safe while each deployment validates the
 * exact hostname it expects.
 */
export function parseExpectedHostnames(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );
}

/**
 * Cheap pre-flight, before a network call is worth making. Not a security check — the
 * only thing that decides a token is good is siteverify.
 */
export function isPlausibleToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    token.trim().length > 0 &&
    token.length <= MAX_TOKEN_LENGTH
  );
}

/**
 * The whole decision, pure. True only when every one of these holds:
 *
 *   - the allowlist is non-empty — an unset `TURNSTILE_HOSTNAMES` accepts NOTHING
 *     rather than everything, which is the difference between a misconfigured gate and
 *     an absent one;
 *   - `success` is true;
 *   - `action` is the action this surface sent, so a token solved elsewhere does not
 *     work here;
 *   - `hostname` is one this deployment expects, so a token solved on a copy of the
 *     page hosted somewhere else does not work here either.
 *
 * The last two are the ones that look redundant next to `success` and are not: a token
 * is valid for the *widget*, and the widget is registered for several domains.
 */
export function isVerificationAcceptable({
  result,
  expectedAction,
  expectedHostnames,
}: {
  result: TurnstileVerifyResult;
  expectedAction: string;
  expectedHostnames: Set<string>;
}): boolean {
  if (expectedHostnames.size === 0) return false;
  if (result.success !== true) return false;
  if (result.action !== expectedAction) return false;
  if (result.hostname === undefined) return false;

  return expectedHostnames.has(result.hostname);
}

/**
 * The network leg. Returns `null` when siteverify could not be reached or did not
 * answer with usable JSON — deliberately distinct from a well-formed `success: false`,
 * even though the route currently treats both as a 403 (fail closed, owner's decision
 * of 2026-09-17). Keeping them distinct is what lets the log say which happened.
 *
 * ⚠️ The secret goes in the BODY, never in the URL. A URL is logged by every proxy in
 * the path; a form body is not.
 */
export async function verifyTurnstileToken({
  token,
  secret,
  remoteIp,
}: {
  token: string;
  secret: string;
  remoteIp?: string;
}): Promise<TurnstileVerifyResult | null> {
  const body = new URLSearchParams({ secret, response: token });
  // Omitted rather than sent empty: siteverify treats a malformed `remoteip` as a
  // reason to fail, and a missing header is not a reason to reject a real submission.
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      body,
    });

    if (!response.ok) return null;

    return (await response.json()) as TurnstileVerifyResult;
  } catch {
    // Network failure, DNS, TLS, the 10s timeout, or a body that is not JSON. All
    // indistinguishable from here and all handled the same way by the caller.
    return null;
  }
}

/**
 * The first hop of `x-forwarded-for` — the client as the edge saw it, before any proxy
 * in the chain appended itself. §8 names the same header for the rate limit that will
 * follow.
 *
 * Returns `undefined` rather than `''` for an absent or blank header, so the caller can
 * omit `remoteip` entirely rather than send something siteverify will reject.
 */
export function clientIpFromForwardedFor(
  header: string | null,
): string | undefined {
  const first = header?.split(',')[0]?.trim();
  return first ? first : undefined;
}

/**
 * A bounded, secret-free rendering of a verification failure, for the server log.
 *
 * ⚠️ NEVER log the result object wholesale and never log the secret. These three
 * fields are what a failure diagnosis actually needs — `invalid-input-secret` means the
 * key never reached the route, `timeout-or-duplicate` means a replayed token, and a
 * surprising `hostname` means `TURNSTILE_HOSTNAMES` is wrong for this deployment.
 */
export function describeVerifyFailure(
  result: TurnstileVerifyResult | null,
): string {
  if (result === null) return 'siteverify unreachable';

  const codes = result['error-codes'];
  return [
    `success=${result.success}`,
    `action=${result.action ?? '(absent)'}`,
    `hostname=${result.hostname ?? '(absent)'}`,
    `codes=${codes && codes.length > 0 ? codes.join(',') : '(none)'}`,
  ].join(' ');
}

# Cloudflare Turnstile — Spam Protection

**Status:** Implemented and verified 2026-09-17 — see `context/current-feature.md`
**Spec date:** 2026-09-17
**Implements:** §8 `403` row · FR-7 sequence (the `H->>T: verify captchaToken` leg) · §7 decision 14
**Follows:** [Turnstile Spin — existing-widget flow](https://developers.cloudflare.com/turnstile/spin/prompt.md)

This is the first file under `context/features/`. `context/project-overview.md` stays
the spec; this file is the implementation contract for one feature and is subordinate
to it. Where the two disagree, the overview wins and this file is wrong.

---

## 1. Why this feature exists

`POST /api/contact` has one spam control: the `_website` honeypot, live since
2026-09-17. It stops the naive bot that fills every input. **It does nothing about a
script that posts JSON directly with `_website` empty** — and that script reaches
Resend, which is the exposure the previous feature recorded as carried forward. The
PDF is forwardable by design (FR-7a); what is at risk is the Resend quota and the
sender reputation of a domain that is not even verified yet.

Turnstile is §7 decision 14, taken on 2026-08-26. It is the control that makes the
route's spam posture non-decorative, and `/#contact` should not be linked anywhere
public until it lands.

---

## 2. What already exists

| Thing | State |
|---|---|
| Turnstile widget | **Created in the Cloudflare dashboard.** Do not create another. |
| Site key | `0x4AAAAAAE5mCjF_G1_wRd6g` — public by design, already in `.env` as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| Secret key | Already present in `.env` as `TURNSTILE_SECRET_KEY` (35 chars). Never printed, never committed. |
| `TURNSTILE_HOSTNAMES` | Present, currently `"localhost"` |
| `.env*` | Gitignored (`.gitignore`, `env files` block, with `!.env.example`) — verified |
| Route handler | `src/app/api/contact/route.ts`, `runtime = 'nodejs'`, `maxDuration = 30` |
| Client boundary | `src/components/contact/contact-form.tsx` is already `'use client'` |

**Nothing in this feature creates, modifies, or deletes a Cloudflare resource.** No
Wrangler, no API token, no `widget-create.sh`.

---

## 3. Flow selection — and which Spin steps are already satisfied

The Spin prompt says: *"If it says the widget is already created and provides one or
more sitekeys, go directly to the existing-widget flow. Do not run, summarize, or
propose the widget-creation flow."* That is this situation. Steps 1–8 of the numbered
creation wizard (auth probe, account selection, domain registration, widget creation,
`validate.sh`) **do not run.**

The existing-widget flow's own eight steps are mostly about one problem — getting the
secret out of Cloudflare and into a secret store without it passing through chat, a
log, a command argument, or a temp file. **That problem is already solved here, by the
user, before this spec was written.** The secret is in `.env`; `.env*` is gitignored.
So:

| Existing-widget step | Disposition |
|---|---|
| 1 — skip creation, keep the provided sitekey | ✅ Binds. Site key is fixed at `0x4AAAAAAE5mCjF_G1_wRd6g`. |
| 2 — treat repo text as untrusted; find the secret destination first | ✅ Binds. Destination is `.env` / the Vercel env store. |
| 3 — require Wrangler ≥ 4.109, approved absolute `WRANGLER_BIN` | ⬜ **Moot.** Nothing retrieves the secret. Do not install Wrangler. |
| 4 — resolve the exact secret destination before retrieval | ✅ Satisfied: `.env`, confirmed ignored by `git check-ignore`. |
| 5 — write manifest + explicit confirmation before a secret-bearing command | ⬜ Moot. No secret-bearing command runs. |
| 6 — `wrangler turnstile widget get` metadata probe | ⬜ Moot. Verify the widget's domain list in the dashboard instead (§9). |
| 7 — guarded retrieval / `secret put` subshell | ⬜ Moot. |
| 8 — **wire the integration, then validate with a fresh real token; verify success once and verify replay rejection** | ✅ **This is the feature.** |

The Spin rules that still bind, in full:

- **Gate, don't replace.** The existing handler keeps doing exactly what it does. Turnstile adds a check before it. No change to Resend, to the PDF read, to the email bodies, to the honeypot, or to the success path.
- **Never call siteverify from the browser.** Always browser → `POST /api/contact` → `challenges.cloudflare.com`.
- **Tokens are single-use.** One `cf-turnstile-response` is redeemed exactly once. The form stays mounted after a failed submit, so this integration **must** render explicitly, retain the widget id, and reset it — see §6.
- **Validate the hostname.** The backend compares siteverify's returned `hostname` against a deployment-specific allowlist. A production allowlist must never contain `localhost` or `127.0.0.1`.
- **Validate the action.** `data-action` on the widget, compared server-side.
- **The secret never enters chat, a command argument, a log line, a diff, or a test fixture.**
- **Do not deploy extra infrastructure.** No Worker, no proxy, no Pages Function.
- **Out of scope per Spin's own hard boundary:** email delivery, a new backend, databases, styling refactors, pre-clearance configuration.

---

## 4. Environment contract

The project's variable names differ from Spin's canonical examples. **Keep the
project's names** — they predate this feature, `.env` already uses them, and §9.4's
rule about the `NEXT_PUBLIC_` prefix is written against them.

| Project name | Spin canon | Visibility | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `SITEKEY` | **Client** | Public. Inlined at build time. This prefix is correct and required. |
| `TURNSTILE_SECRET_KEY` | `TURNSTILE_SECRET` | Server only | ⚠️ **Never prefix with `NEXT_PUBLIC_`** (§9.4). Same rule as `RESEND_API_KEY`. |
| `TURNSTILE_HOSTNAMES` | `TURNSTILE_HOSTNAMES` | Server only | Comma-separated. **Deployment-specific.** |

`TURNSTILE_HOSTNAMES` values:

- Local: `localhost` (current value — correct)
- Production: `www.dasigr.com,dasigr.com` — **and nothing else.** No `localhost`.

**Deliverable: `.env.example` gains all three**, with the same comment density as the
Resend block already there. It currently documents none of them, which means a fresh
clone gets a route that 403s every submission with no explanation on disk.

**Deliverable: set all three in the Vercel project** (Production and Preview scopes)
before deploy. `vercel env` or the dashboard; the value never passes through chat.

---

## 5. Server side

### 5.1 New module — `src/lib/turnstile.ts`

Per CLAUDE.md, testable logic lives in `src/lib/*`, not in the route — and the route
is the one file the Vitest glob cannot see (`src/{actions,lib}/**/*.test.ts`). The
same reasoning that put the honeypot in `src/lib/spam.ts` applies here, and more
strongly: the decision has four conjuncts and three of them are easy to drop silently.

**Server-only.** ⚠️ It must never be imported by `contact-form.tsx`. Next replaces
non-`NEXT_PUBLIC_` env references with `undefined` in client bundles rather than
leaking them, so the failure would be a silent always-403 rather than a leak — but the
rule stands, and the site key is read inline in the form (§6) precisely so no import
edge exists between the two.

Exports:

```ts
/** The surface's stable action. 1–32 chars, [A-Za-z0-9_-] only, per Spin step 7. */
export const TURNSTILE_ACTION = 'contact';

/** siteverify's response shape, narrowed to the fields this decision reads. */
export interface TurnstileVerifyResult {
  success: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/** Splits TURNSTILE_HOSTNAMES. Trims, drops empties. Returns a Set. */
export function parseExpectedHostnames(raw: string | undefined): Set<string>;

/**
 * The whole decision, pure and testable. True only when ALL of:
 *   result.success === true
 *   result.action === expectedAction
 *   expectedHostnames.has(result.hostname)
 *   expectedHostnames.size > 0        ← an empty allowlist accepts nothing
 */
export function isVerificationAcceptable(args: {
  result: TurnstileVerifyResult;
  expectedAction: string;
  expectedHostnames: Set<string>;
}): boolean;

/** Cheap pre-flight, before a network call is worth making. */
export function isPlausibleToken(token: unknown): token is string;
  // string, non-empty, length <= 2048 (Spin's cap)

/** The network leg. Impure; separated so the decision above stays unit-testable. */
export async function verifyTurnstileToken(args: {
  token: string;
  secret: string;
  remoteIp?: string;
}): Promise<TurnstileVerifyResult | null>;  // null = could not reach siteverify
```

`verifyTurnstileToken` is the canonical Spin fetch, unchanged in substance:

- `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
- `Content-Type: application/x-www-form-urlencoded`
- body: `secret`, `response`, `remoteip`
- `signal: AbortSignal.timeout(10_000)`
- non-`ok` response, thrown fetch, or unparseable JSON → return `null`

⚠️ **Never log `result` wholesale and never log the secret.** Log
`result['error-codes']`, `result.action`, and `result.hostname` only — those three are
what a failure diagnosis actually needs, and a blanket `console.error(result)` is how a
secret ends up in Vercel's log drain the day someone adds it to the request body for
debugging.

### 5.2 Route wiring — `src/app/api/contact/route.ts`

**Position: after `parseContact`, before `decideContactDelivery`.** That is FR-7's own
order (rate check → Turnstile → honeypot), and it is right for the same reason the
honeypot sits after Zod: a malformed payload must get its `400` regardless of what the
captcha says, or the response becomes a probe.

Consequence worth stating, because it is not obvious: **once Turnstile is live, a real
bot almost never reaches the honeypot.** The honeypot stays anyway — it is free, it is
defence in depth, and its parity tests in `spam.test.ts` keep the §8 "identical
response" guarantee honest. Nothing about `src/lib/spam.ts` changes.

Add one row to `RESPONSES`, matching §8 byte for byte:

```ts
forbidden: () =>
  Response.json(
    { success: false, error: 'Captcha verification failed' },
    { status: 403 },
  ),
```

The check, in order:

1. Read the token from the parsed body as `captchaToken` (§5.3).
2. Read `process.env.TURNSTILE_SECRET_KEY` and `parseExpectedHostnames(process.env.TURNSTILE_HOSTNAMES)`.
3. **Misconfiguration fails closed:** secret missing/empty, or allowlist empty → `console.error` naming the variable, return `RESPONSES.forbidden()`. See the decision in §10.2.
4. `!isPlausibleToken(token)` → `forbidden()`. No network call.
5. `verifyTurnstileToken(...)` → `null` → `forbidden()`.
6. `!isVerificationAcceptable(...)` → log `error-codes` / `action` / `hostname`, return `forbidden()`.
7. Fall through to the honeypot, unchanged.

`remoteIp` comes from the first hop of `x-forwarded-for` (`.split(',')[0].trim()`),
the same header §8 names for the rate limit. If the header is absent, omit `remoteip`
rather than sending an empty string.

`maxDuration = 30` stays. This adds a fourth awaited leg, capped at 10 s by its own
`AbortSignal`, and FR-7 already budgeted for it ("after a Turnstile round-trip").

### 5.3 Schema — `src/lib/contact-schema.ts`

§8's request body names the field **`captchaToken`**, not `cf-turnstile-response`.
Keep the spec's name; it is a JSON API, not a form POST, and the value it carries is
the widget's `cf-turnstile-response`.

Add it as **`z.optional(z.string())`** — deliberately loose, exactly like `_website`:

```ts
/**
 * Turnstile token. Accepted here and judged elsewhere — src/lib/turnstile.ts and the
 * route own it, and a failure is §8's 403, not a 400.
 *
 * ⚠️ DO NOT MAKE THIS REQUIRED. A required field turns a missing token into a 400
 * whose body names `captchaToken` — a field the form draws no <FieldError> for, so
 * the user gets the generic failure state for a cause the response has already
 * described wrongly. §8 gives captcha failure its own status code; let it have it.
 */
captchaToken: z.optional(z.string()),
```

This also keeps the client's `parseContact(values)` — which runs on every keystroke,
long before any token exists — from reporting the form invalid for its entire life.

⚠️ The schema file's existing warning applies verbatim: it ships to the browser, so
**no Node imports and no `zod` (classic) imports.** Adding one optional string costs
nothing measurable; adding an import costs 69 KB.

---

## 6. Client side — `src/components/contact/contact-form.tsx`

**No new `'use client'` boundary.** The form is already the site's second and last one.
This is the entire reason the widget goes here and not into a wrapper component.

### 6.1 Script loading

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
```

Load it with `next/script`, `strategy="lazyOnload"`. Reasoning: this is a single-page
site, so the contact form is in the initial DOM for every visitor, but the challenge is
not needed until someone intends to submit. `lazyOnload` keeps `api.js` off the
critical path and out of LCP.

⚠️ **`api.js` is a third-party script and does not appear in `next build`'s First Load
JS**, so the §NFR budget will not move. That is not the same as free — it is roughly
80 KB of transfer on a page that is already carrying a 5.5 MB portrait. Record the
observed transfer size in the completion notes rather than asserting a number here.

### 6.2 Explicit render, not `class="cf-turnstile"`

Implicit rendering is the shorter snippet and it is **wrong for this form.** Spin's
token-lifecycle rule: *"If the page remains active after a submission attempt, render
the widget explicitly, retain that widget's ID, and call `window.turnstile.reset(widgetId)`
after the request completes."* This form remains active after every non-success
outcome — 400, 403, 500, and the offline path all keep it mounted with its values
intact, which is FR-6's "the lead is never lost" behaviour.

So: a `useEffect` that calls `window.turnstile.render(containerRef.current, {...})`
once the script is ready, storing the returned id in a ref.

Options:

| Option | Value | Why |
|---|---|---|
| `sitekey` | `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Read inline here. No shared module — see §5.1. |
| `action` | `'contact'` | Must equal `TURNSTILE_ACTION` server-side. |
| `theme` | `'dark'` | The site is dark-mode-first (CLAUDE.md). `'auto'` follows the OS, which the site does not. |
| `callback` | sets `captchaToken` state | |
| `expired-callback` | clears `captchaToken` state | Tokens expire ~300 s after issue. A recruiter who opens the page, writes three paragraphs, then submits is the exact user this catches. Without it they get a 403 for having taken their time. |
| `error-callback` | clears the token, surfaces a retry message | Network failure or a blocked challenge. |
| `size` | see below | |

React Compiler is on — do not hand-add `useMemo`/`useCallback` around any of this.

⚠️ **Cleanup:** the effect must call `window.turnstile.remove(widgetId)` on unmount,
and must not re-render the widget on every render. The success state replaces the whole
form, so unmount is a real path, and a leaked widget leaves an orphaned iframe.

### 6.2a Two lifecycle traps, found during implementation

Both were invisible to the unit suite and were caught in the browser. They are recorded
here because both fixes look like over-engineering until you know what they prevent.

- **Readiness must be polled, not signalled.** `?onload=` on the api.js URL and
  next/script's `onReady` are both races: api.js invokes its onload global the moment it
  initialises, which can precede React assigning it, and `onReady` can fire before
  `window.turnstile` is defined. Losing either race means the widget never renders and
  every submission 403s with nothing on screen to explain it. Poll for
  `window.turnstile.render` every 100 ms instead, and give up after 15 s with a message.
- **The widget must be torn down *before* the unmount, not in the cleanup.** React
  detaches the form's subtree before running passive effect cleanups, so `remove()` in a
  cleanup always arrives after Turnstile's DOM is gone — Cloudflare then logs "Cannot
  find Widget … consider using turnstile.remove()" on every success. Guarding the
  cleanup does not help; the warning is Cloudflare noticing an untorn-down disappearance.
  Call `remove()` explicitly before `setStatus('success')`.

### 6.3 Reset

After **every** completed request that leaves the form mounted, call
`window.turnstile.reset(widgetId)` and clear the `captchaToken` state. A spent token is
spent whether the request returned 200, 400, 403 or 500; re-submitting with the same
one yields `timeout-or-duplicate` and a 403 the user cannot explain.

### 6.4 Submit gating and error copy

- Keep the button enabled. Disabling it on "no token yet" gives a recruiter a dead button with no stated cause, which is worse than a message.
- Submitting without a token: show an inline message near the widget rather than posting — *"Please complete the verification below."* Wire it through the existing `FieldError` pattern with `aria-describedby` so it is announced, and add `captchaToken` to `RENDERED_ERROR_FIELDS`.
- **A 403 from the server needs its own message.** Today `handleSubmit` funnels every non-200 into `status: 'error'`, which renders *"That did not go through… email me directly."* That copy is right for a 500 and wrong for a 403 — it tells a recruiter the server broke when the fix is to retry the challenge. Add a branch: on 403, reset the widget and show *"Verification failed. Please try the challenge again."* **Keep the `mailto:` fallback visible on that branch too** — if Turnstile is blocked on their network, retrying will never work, and FR-7a rates a silent loss worse than no gate at all.

### 6.5 Layout

The widget is 300×65 at default size. The form is 390 px wide at the mobile breakpoint
the repo verifies at, inside `p-7` padding — **check for horizontal overflow at 390 px**
before calling this done. Turnstile's `size: 'flexible'` fills the container width if
the fixed width does not fit; prefer it over scaling the widget with CSS transforms,
which blurs the iframe.

---

## 7. Files touched

| File | Change |
|---|---|
| `src/lib/turnstile.ts` | **New.** §5.1. |
| `src/lib/turnstile.test.ts` | **New.** §8. |
| `src/lib/contact-schema.ts` | Add optional `captchaToken` + the warning comment. |
| `src/app/api/contact/route.ts` | `RESPONSES.forbidden`, the check, and **the header comment** — it currently says "403 and 429 are reserved and unused" and "Turnstile … deliberately deferred". Both become false. |
| `src/components/contact/contact-form.tsx` | Widget, token state, reset lifecycle, 403 branch, error copy. Its header comment lists three contract details; the widget is a fourth. |
| `src/lib/spam.ts` | **Comment only.** Its header says Turnstile "is still deferred". Correct it; the code does not change. |
| `.env.example` | Add all three variables with commentary. |
| `context/current-feature.md` | Fill in Status/Goals/Notes **before** implementing (workflow step 1). |
| `CLAUDE.md` | The gated-PDF paragraph lists "two Resend calls + Turnstile + Redis" as the reason for `maxDuration` — already accurate. Check the §8/spam wording after implementation and correct anything that reads as deferred. |

**Do not touch:** `src/lib/resume.ts`, `src/lib/contact-email.ts`, `next.config.ts`,
`src/lib/spam.ts` logic, the email bodies, or anything under `src/content/`.

The previous feature had to correct four stale comments claiming the honeypot was not
implemented. **The comment updates above are part of the change, not a follow-up.**

---

## 8. Tests

Vitest, `src/lib/turnstile.test.ts`, inside the existing glob. No network, no DOM.

`parseExpectedHostnames`:

- `undefined` and `''` → empty Set
- `'localhost'` → `{localhost}`
- `'www.dasigr.com, dasigr.com'` → both, trimmed
- `'a,,b,  ,c'` → three entries, no empties

`isVerificationAcceptable` — one test per conjunct, each failing in isolation:

- all four satisfied → `true`
- `success: false` → `false`
- `action` mismatch (and `action` absent) → `false`
- `hostname` not in the allowlist (and `hostname` absent) → `false`
- **empty allowlist with an otherwise perfect result → `false`.** This is the one that catches an unset `TURNSTILE_HOSTNAMES` in production, and it is the one a careless refactor removes.
- a result with extra unknown fields → still `true` (siteverify may add fields)

`isPlausibleToken`: `undefined`, `null`, `''`, `'   '`, a 2049-char string → `false`;
a normal token → `true`.

`verifyTurnstileToken`: `vi.stubGlobal('fetch', ...)` per ai-interaction.md's mocking
rule. Assert the request shape (URL, method, content type, the three body params) and
that a non-`ok` response, a thrown fetch, and unparseable JSON each return `null`.
⚠️ Assert that the secret appears in the **body**, never in the URL.

**The route itself still cannot be unit-tested** under the current glob. Its ordering
is proven by §9 only. Do not widen the glob for this feature.

---

## 9. Verification — no "done" without this

Spin step 8: *"validate the actual destination through the protected backend using a
fresh real token. Verify success once and verify replay rejection. If the backend
cannot be exercised, stop with destination validation pending."*

**Before anything else:** open the widget in the Cloudflare dashboard and confirm its
domain list contains `localhost` **and** `www.dasigr.com`. If `localhost` is absent the
widget will not render locally and nothing below can run; if the production hostname is
absent the gate fails closed on deploy.

Browser, dev server, at 1280 and 390:

1. The widget renders, in dark theme, with no horizontal overflow at 390.
2. A complete submission with the challenge solved → 200, both emails arrive, the success state names the address. **This is the fresh-real-token success.**
3. **Replay:** capture the `captchaToken` from the network panel in step 2 and POST it again with curl. Expect `403 {"success":false,"error":"Captcha verification failed"}` and `timeout-or-duplicate` in the server log. **This is the replay rejection, and it is the half that proves single-use redemption rather than assuming it.**
4. Submit with no token → the inline "complete the verification" message, no request made.
5. Force a 403 (tamper with the token) → the 403 copy appears, the widget resets, the `mailto:` fallback is visible, and a second genuine attempt then succeeds.
6. Hostname rejection: temporarily set `TURNSTILE_HOSTNAMES=example.com`, submit with a genuine token → 403, with the real hostname in the log. Restore afterwards. **This proves hostname validation is wired, which nothing else in this list does.**
7. Action rejection: temporarily change the widget's `action` to `'nope'` → 403. Restore.
8. Honeypot regression: filled `_website` with a **valid** token → still 200 with the correct `resumeSent`, nothing sent. The §8 parity survives the new check.
9. Validation still wins: bad email with a valid token → 400, not 403.

curl-level checks may use Cloudflare's published testing keys in a local `.env`
override. ⚠️ **Observe what siteverify actually returns for `hostname` and `action`
under those keys before writing any assertion against them** — do not assume they
mirror the real widget. The repo's standard is to verify rather than infer.

`npm run test` and `npm run build` both green before committing (workflow step 4).

---

## 10. Decisions this spec makes, and the two that need the owner

### 10.1 Made here

- **Field name is `captchaToken`** (§8's request body), carrying the `cf-turnstile-response` value.
- **Optional in the schema, enforced in the route**, so captcha failure is a 403 and not a 400 — mirroring how `_website` is accepted by the schema and judged by `spam.ts`.
- **Turnstile runs after Zod, before the honeypot** — FR-7's order.
- **Explicit render with a retained widget id**, because the form survives failure.
- **The 403 gets its own client copy**, keeping the `mailto:` fallback.

### 10.2 ✅ Decided 2026-09-17 by the owner — fail closed, everywhere

Spin's canon is unambiguous: an unreachable siteverify, a missing secret, or an empty
hostname allowlist all return `forbidden`. This spec follows it.

But the repo has a competing principle, stated twice in FR-7a and once in
`current-feature.md`: **a silently lost recruiter lead is worse than no gate.** Failing
closed on a misconfiguration means a typo in a Vercel environment variable rejects every
legitimate submission.

It is chosen anyway, and the reason is that the loss is **not silent**: a 403 lands in
the form's visible error state with the `mailto:` fallback on screen (§6.4). The
recruiter can still reach the owner. Fail *open* would mean a typo silently disables
the spam control with nothing visible anywhere — the failure mode that produced the
"decorative gate" note about the public repo.

**The narrower variant was offered and declined.** Failing open on
`verifyTurnstileToken() === null` specifically — Cloudflare unreachable, as distinct
from misconfigured — was the alternative on the table. The owner chose fail closed
everywhere on 2026-09-17. So a siteverify outage takes the contact form's submit path
down with it, and the `mailto:` fallback is what carries the lead during one.

### 10.3 ⚠️ Needs the owner — preview deployments

Turnstile widgets validate against a fixed domain list. Vercel preview URLs are
generated per deployment (`dasigr-git-*.vercel.app`), so **the widget will not render on
a preview and every preview submission will 403.** Three options:

1. Accept it. Previews cannot exercise the contact form. Simplest, and the form is already verified locally and in production.
2. A second Turnstile widget for previews, with its own site key and secret in the Preview environment scope.
3. Cloudflare's testing site key (`1x00000000000000000000AA`) plus the always-passes testing secret in the Preview scope, which makes the gate a no-op there. ⚠️ Only acceptable while previews are not publicly linked.

Recommendation: **option 1** until a preview deployment needs to demo the form.

---

## 11. Acceptance criteria

- [ ] A submission without a valid, unspent, correctly-scoped Turnstile token cannot cause a Resend call.
- [ ] §8's `403` row returns exactly `{"success": false, "error": "Captcha verification failed"}`.
- [ ] `success`, `action` and `hostname` are all checked; the empty-allowlist case rejects.
- [ ] Replay of a spent token is rejected, **demonstrated**, not asserted.
- [ ] The honeypot's §8 identical-response parity is intact and its tests still pass.
- [ ] The resume PDF still has no link anywhere in the served HTML (FR-7a unchanged).
- [ ] The secret appears in no commit, log, test fixture, diff, or `.env.example` value.
- [ ] No new `'use client'` boundary; `next build`'s First Load JS figure for `/` is unchanged within noise.
- [ ] No horizontal overflow at 390 px.
- [ ] Every comment claiming Turnstile is deferred has been corrected.
- [ ] `npm run test` and `npm run build` pass.

---

## 12. Explicitly not in this feature

- **The Upstash rate limit (§8's `429`).** Still reserved and unreturned. ⚠️ When it lands, **do not use a module-level `Map`** — §8 warns each invocation may be a fresh instance, and a decorative limit is worse than none. It belongs *before* the Turnstile check, per FR-7.
- **`EMAIL_FROM` is still `onboarding@resend.dev`**, so every recruiter's copy is still rejected with a 403 by Resend. Unrelated to this feature, still a launch prerequisite.
- **The PDF is still committed to a public GitHub repo** (`origin` is `github.com/dasigr/dasigr`), so `raw.githubusercontent.com` serves it and the FR-7a gate is decorative regardless of how good the form's spam protection gets. **Spam protection on the form does not touch this, and finishing this feature must not be read as closing it.**
- **FR-6's 60-second client throttle.** Deliberately absent; see the Resume Request feature's notes.
- **`public/romualdo-dasig-portrait.jpg` is still 5.5 MB.**
- **Persisting the Spin skill** to `.claude/skills/turnstile-spin/` (its step 11). Optional; ask the owner. Nothing in this feature depends on it.

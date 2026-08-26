# Current Feature: Resume Request & Delivery

## Status

**In Progress.** Branch `feature/resume-request-delivery`, started 2026-08-26.

## Goals

- A recruiter submits the contact form and receives an email with the resume PDF
  attached, in under 60 seconds (G-4). The form is the only route to the file —
  no download link is added anywhere (FR-7a).
- The owner receives a separate notification email for the same submission, with
  every field, the Asia/Manila timestamp, the referrer, and whether the resume was
  requested. `Reply-To` is the submitter's address so a reply goes straight back
  to them (G-5).
- `POST /api/contact` implements the §8 contract: `runtime = 'nodejs'`, an explicit
  `maxDuration`, and the documented status/body for each outcome it handles
  (200 success · 200 honeypot · 200 resume-unticked · 400 · 500). **429 is out of
  scope — see Notes.**
- One Zod schema in `src/lib/` is imported by both the form and the route
  handler. Client validation is UX; the server copy is the control.
- A minimal `/privacy` page exists and the consent checkbox links to it, so the
  consent FR-6 requires is informed rather than blind (§9.5).
- `ContactForm` becomes the site's second `'use client'` boundary and behaves per
  FR-6: inline validation on blur, `aria-live` errors linked by
  `aria-describedby`, disabled-with-spinner submit, success state that replaces
  the form and names the address the PDF went to, and a failure state that always
  offers the `mailto:` fallback so the lead is never lost.
- The PDF moves from `docs/` to `private/` and is read via `process.cwd()`, with
  `outputFileTracingIncludes` covering it so the route does not throw `ENOENT` in
  production only.
- Vitest covers the new `src/lib` logic — schema acceptance/rejection at each FR-6
  boundary, honeypot detection, Asia/Manila formatting, and field sanitisation.
  `npm run test` and `npm run build` both pass.

## Notes

**What exists today.** [contact-form.tsx](src/components/contact/contact-form.tsx)
is presentational only — no `action`, no `onSubmit`, `type="button"`. Its header
comment already names the three details that are the real contract here. Every
field name in the markup (`name`, `email`, `company`, `message`, `requestResume`,
`consent`, `_website`) matches the §8 request body, so the markup should need
markup changes only where validation and state require them.

**Nothing is installed.** No `zod`, `resend`, `react-hook-form`, `@upstash/redis`,
or Turnstile package in `package.json`. `src/actions/` does not exist yet.

**Decided: no spam controls in this feature — email delivery only.** Owner's call,
2026-08-26: rate limit, honeypot enforcement, and Turnstile are all deferred. The
`403` and `429` rows of the §8 table go unused; no `@upstash/redis` and no
Turnstile dependency are added.

**⚠️ The consequence, stated plainly so it is not discovered later:** the route
ships with **zero spam protection**. Any script that can POST JSON can make the
server email an arbitrary address, with a PDF attached, as fast as Resend will
accept it. Three things that follow:

- The exposure is the **Resend send quota and sender reputation**, not the PDF —
  the file is public-by-forwarding anyway (FR-7a). A burnt sending domain is the
  expensive failure here.
- The `_website` honeypot input **stays in the markup** but the server ignores it.
  It costs nothing and makes the follow-up a two-line change. The form comment is
  updated to say the check is not live, so nobody reads the field as protection.
- **Do not substitute an in-memory counter** when the limit does land. §8 warns
  each invocation may be a fresh instance; a module-level `Map` reads as a limit
  while enforcing nothing. No limit you know about beats a decorative one.

This is safe only while the site is unlaunched and the URL is unknown. **Turnstile
plus the Upstash limit should be the next feature, before `/#contact` is linked
from LinkedIn.**

**One open question that blocks end-to-end delivery:**

- **Resend sender.** `.env` has `RESEND_API_KEY` and `EMAIL_FROM=onboarding@resend.dev`.
  That sandbox sender can only deliver to the Resend account's own address — a
  recruiter's inbox will be rejected, which fails G-4 silently. A verified sending
  domain for `dasigr.com` is a prerequisite, not a polish item. The code reads
  `EMAIL_FROM` from the environment, so this is a configuration change and not a
  code change, but it must happen before launch.

**Route handler vs Server Action.** §5 (line 231) leaves this open. If a Server
Action is chosen, §8 becomes the action's input schema and return type rather than
an HTTP contract, and the Turnstile check moves into the action body. The spec's
own diagrams and FR-7 assume the Route Handler; deviating is a decision to record.

**The gate is fragile in known ways** (CLAUDE.md, §11.1, FR-7a):

- The repo must stay private while the PDF is committed, or
  `raw.githubusercontent.com` serves it and the gate is decorative.
- `https://www.dasigr.com/romualdo-dasig-resume.pdf` is live today. A 301 is
  necessary but not sufficient — the file must actually be deleted from the origin
  and any CDN cache at cutover, confirmed by a direct request against production.
- No DRM, no watermarking, no expiring links. The point is knowing who asked, not
  controlling redistribution.
- Sanitise every field before interpolating into email HTML, and never echo the
  submitted message back in Email A.

**Budget.** A new `'use client'` boundary is the one thing that moves First Load
JS. The 176 KB / 120 KB gap carried forward from the SPA feature is unresolved and
this feature will add to it — measure the delta rather than the absolute.

**Privacy.** FR-6 requires the consent checkbox to link to a privacy notice at
`/privacy`, which does not exist. Either it lands here or the link is a dead link
the spec forbids. → Built: `src/app/privacy/page.tsx`, linked from the consent
label.

---

## Implementation notes

**`zod/mini`, not `zod`, and the reason is 54 KB.** The shared schema is imported
by a Client Component, so whatever it imports ships to the browser. Measured
against a `main` build with the same `node_modules`: classic zod put the client
chunks at **246.0 KB gz, +69.3 KB over baseline**. The same schema rewritten in
`zod/mini` — identical behaviour, all 146 tests unchanged — lands at **192.4 KB
gz, +15.7 KB**. The `z` namespace in classic zod does not tree-shake. The
functional `.check(z.trim(), z.minLength(2))` style in `contact-schema.ts` is
therefore load-bearing, not taste, and the file says so.

**Baseline for future features: 176.7 KB gz on `main`.** Measured by summing
gzipped `.next/static/chunks/*.js`, because Next 16 with Turbopack no longer
prints a First Load JS figure. Reproduce with a `git worktree` at `main` and a
*copied* `node_modules` — a symlink fails with "points out of the filesystem
root" under Turbopack.

**`EMAIL_TO` was added** (defaults to `profile.email`). It exists because the
Resend sandbox will only deliver to the account address, so without it there is no
way to exercise the real path locally. Documented in `.env.example`.

**Verified end to end, not just typechecked.** The success path was run against
the live Resend API: `200 {"success":true,"resumeSent":true}`, both emails away in
1.8s. The §8 failure rows were exercised with curl — 400 for an empty body, a bad
email, malformed JSON, and an oversized payload; 405 on GET. The `resumeSent:false`
path returns 200 with no attachment.

**The ENOENT trap is closed and checked.** `.next/server/app/api/contact/route.js.nft.json`
names `private/romualdo-dasig-resume.pdf`, so `outputFileTracingIncludes` is doing
its job rather than being assumed to.

**The gate holds.** `grep` over the served HTML for any `href` containing pdf,
resume, or download returns nothing, and `/romualdo-dasig-resume.pdf`,
`/private/romualdo-dasig-resume.pdf` and `/RomualdoDasigResume.pdf` all 404.

**Browser-verified at 1280 and 390:** blur validation sets `aria-invalid` and
links the message via `aria-describedby`; an empty submit shows all four errors and
makes no network request; in-flight the button is disabled and shows a spinner; on
success the form is replaced by a `role="status"` confirmation naming the address;
on a forced 500 the form is kept with its values intact and a `role="alert"` block
offering a `mailto:` prefilled with the subject and the user's own message. No
horizontal overflow at 390.

**Deliberately not implemented — FR-6's "one submission per 60 seconds per
browser session".** On the success path the form is replaced, so it cannot fire; on
the error path it would lock a recruiter out for a minute because *the server*
failed, which is precisely the lost lead FR-7a says is worse than no gate. The
in-flight guard covers the double-click case it was really protecting against.

## History

### Single Page Application — completed 2026-08-26

Ported [prototype/index.html](prototype/index.html) to the App Router as one page with
seven hash-anchored sections (Hero · About · Skills · Experience · Projects ·
Testimonials · Contact). Every section is a Server Component;
`src/components/layout/site-header.tsx` is the only `'use client'` boundary, for the
mobile menu. Content moved into typed `src/content/*` files; projects, testimonials,
and their counts read from `src/lib/mock-data.ts`.

Four claims are derived rather than written down, each at a point where the site could
drift from the resume: the nav array and section numbering (from `hasTestimonials`, so
hiding Testimonials removes its nav item and renumbers Contact in one step); "17+
years" (computed from the employment table, rounded down); career-bus segment widths
(each engagement's length in months); and the "no gaps" claim (checked against the
data — it disappears from the headline and the screen-reader label if an entry breaks
continuity). Added the Vitest setup CLAUDE.md requires of the first change to touch
`src/lib` — 43 tests across career, navigation, format, and assets.

Verified in the browser at 1280 and 390: nav targets all resolve and land clear of the
sticky header, mobile menu opens and closes on link click and Escape, no horizontal
overflow, and the form cannot submit (no action, `type="button"`, and a real Enter
keypress leaves the URL untouched).

**Carried forward — not done in this feature:**

- **First Load JS is 176 KB gzipped against the 120 KB budget in §NFR.** 169 KB is the
  framework floor: `/_not-found`, which contains none of this feature's code, measures
  the same. SiteHeader adds 7 KB. Next 16.3.3 with Turbopack also stopped printing a
  First Load JS figure in `next build`, so the tracked-budget workflow in CLAUDE.md
  needs rebasing on a measured floor before the number means anything.
- **Project thumbnails do not exist** — all eight cards render a "Screenshot pending"
  placeholder. `publicAssetExists()` switches a card to `next/image` the moment a WebP
  lands at the path named in mock-data; no code change needed.
- **`public/romualdo-dasig-portrait.jpg` is 5.5 MB** (4672×7008). `next/image` resizes
  it on delivery, but the source is heavy in git history. Worth downscaling.
- **`docs/RomualdoDasigResume.pdf` is deliberately still untracked.** Committing it
  makes the FR-7a gate depend entirely on the repo staying private, and §11 wants the
  file in `private/` rather than `docs/` regardless.
- **Case-study links are absent by design.** `caseStudySlugs` is non-empty, but
  `/projects/[slug]` does not exist yet and a link to it would be the dead link FR-5
  forbids. The guarded link belongs in `ProjectCard` when that route lands.
- **Testimonials render the fictional fixtures** from mock-data.ts. Content swap.
- **Experience bullets for Dentsu, Peregrine, and Zyrous are still duty statements**
  (§6.10 wants outcomes); two freelance periods carry no bullets at all.

### Active Navigation Link — completed 2026-08-26

The nav gave no sign of where the reader was. Clicking a link now marks it active,
and the highlight follows the reader as they scroll, so it cannot go stale and claim
a section that is not on screen. `aria-current="true"` announces it; the visual cue
is an accent bar — left edge in the stacked menu, under the label in the desktop row
— because §9.2 does not let colour carry it alone. No new `'use client'` boundary:
it all lives in `SiteHeader`, which was already one.

Clicks need no handler of their own. Following a nav anchor changes the hash, so a
single `hashchange` listener covers the nav links, both `Get My Resume` buttons and
the back button. A jump holds the highlight on its target and ignores every section
the smooth scroll passes on the way — without that, one click on Projects repaints
three times before settling. It is released on arrival, or 120ms after scroll events
stop; that second path is what rescues a jump that never lands, and it was added
after the browser caught a hash change producing no scroll at all leaving the
highlight stuck.

Not built on `IntersectionObserver`, despite the plan saying so. Answering "which
section is at the reading line" needs an IO root collapsed to a 1px band via
`rootMargin`, which is expressed in px and so must be rebuilt on every resize — and
it still answers "entered/left" rather than "which one". A passive scroll listener
coalesced into one `requestAnimationFrame` reads the section rects and hands them to
a pure function. The reading line itself is read from the computed
`scroll-padding-top`, so the highlight flips at exactly the line the browser lands
anchors on rather than at a second, drifting copy of that number.

Three decisions moved into `src/lib/navigation.ts` with 21 new tests (76 total):
`pickActiveSection` (deepest section past the reading line; null above the first,
where the Hero has no nav item; the last section once the page runs out of scroll,
since Contact is shorter than the viewport and its top edge never reaches the line),
`activeSectionFromHash` (`#top` and `#main` clear the highlight rather than fail to
match) and `sectionIdsFromNav`, which keeps the ids derived from the nav so the
Testimonials gate still removes the item cleanly.

Verified in the browser at 1280 and 390 by watching `aria-current` through a
MutationObserver: clicking Projects from the top goes `(none) → Projects` with no
repaints in between, a manual scroll moves the highlight with no click, the brand
clears it, and a direct `/#experience` load is right on first paint. At 390 the
highlight read Experience while the hash said `#projects` — correct, and worth
knowing: late reflow drifts the browser's anchor landing, and the scroll position is
what tells the truth afterwards.

### Project Screenshots — completed 2026-08-26

The three featured cards had been rendering "Screenshot pending" since the section
was built. Captured the homepage of cebufest.com, pvsystemtek.com, and
accuglassproducts.com and dropped a WebP at the path each entry in `mock-data.ts`
already named. **No component changed** — `publicAssetExists()` was written for
exactly this and switched all three cards to `next/image` on the next build, which
is the design working rather than a happy accident.

Captured at a 1280×960 viewport. That is exactly 4:3, so the downscale to the
800×600 the card expects is a pure resize with no crop and no decision about what to
cut. `sharp` 0.35.3 turned out to be already present as a transitive dependency of
Next, so the conversion needed nothing installed; WebP q=82 gives 55–63 KB each,
176 KB for all three. Two things had to be handled before the shutter: CebuFest's
cookie banner (dismissed), and the scrollbar — an overlay in headless Chromium
rather than layout-occupying, confirmed by `clientWidth === innerWidth === 1280`,
and hidden with injected CSS so it did not sit in the right edge of every frame.

Scope was the three featured projects, not all eight. `additionalLeadProjects`
renders as a text-link list with no image slot, so the other five thumbnail paths in
`mock-data.ts` stay unused by design.

One test had to change, and it is the interesting part. `assets.test.ts` asserted
`publicAssetExists('/images/projects/cebufest.webp') === false` — it recorded the
launch state rather than the behaviour, and so failed the moment the feature
succeeded. Repointed at a path that will never exist, and added a table-driven test
over `featuredProjects` asserting each thumbnail resolves. That second one matters
because a missing thumbnail does not error: it silently reverts a card to the
placeholder, and nothing else in the suite would have noticed. 58 tests.

Verified in the browser at 1280 and 390: all three render `<Image>` with
`complete: true` and the right alt text, 4:3 preserved (359×269 desktop, 333×250
mobile), no horizontal overflow, `next/image` serving a 384w variant at card size.

**Carried forward — not done in this feature:**

- **accuglassproducts.com serves an empty `<title>`.** Observed while capturing.
  Not this repo's problem, but it is a live client site and a real SEO defect.
- **`docs/RomualdoDasigResume.pdf` is still deliberately untracked** and was kept
  out of this commit on purpose. §11 still wants it in `private/`, not `docs/`.
- **`public/romualdo-dasig-portrait.jpg` is still 5.5 MB.** Unchanged here; the
  tooling proven in this feature (sharp, already installed) is what will fix it.
- **The other five thumbnail paths in `mock-data.ts` remain unused.** They only
  become worth filling if `additionalLeadProjects` ever grows a card layout.

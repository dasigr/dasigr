# Current Feature: Spam Protection — Honeypot

## Status

In Progress

## Goals

- `POST /api/contact` rejects a submission whose `_website` honeypot is filled:
  no PDF read, no Resend call, no lead notification.
- **The rejection is byte-identical to a success** (§8): status `200`, body
  `{ "success": true, "resumeSent": <what the submission asked for> }`, same
  headers. A bot must not be able to tell it was caught.
- The decision lives in `src/lib/` as a pure function, not inline in the route,
  and is covered by Vitest — including the identical-response requirement, which
  is the part a future refactor can silently break.
- The three source comments that currently say the check is **not** implemented
  (`route.ts` header, `contact-form.tsx` header + honeypot markup,
  `contact-schema.ts` `_website`) are corrected in the same change, so nothing in
  the tree still tells the next reader the field is decorative.
- Verified end-to-end: a `curl` with `_website` filled returns the success body
  and sends nothing; a normal submission still delivers both emails.
- `npm run test`, `npm run lint`, `npm run build` all pass.

## Notes

**Scope is the honeypot only.** §8 names three spam controls — Turnstile (403),
the Upstash rate limit (429), and the honeypot. This feature is the third one.
`403` and `429` stay reserved and unreturned; `captchaToken` is not added to the
schema. The honeypot is the one control that needs no third-party account, no new
env var, and no bundle cost, which is why it goes first.

**The field already exists and is already wired.** `contact-form.tsx:294-311`
renders `_website` off-screen (`-left-[9999px]`, not `display:none` — a bot that
reads styles skips hidden fields but fills one it can "see"), sends it, and
`contactSchema` accepts it as `z.optional(z.string())`. **Do not change it to
`maxLength(0)`** — a 400 on a filled honeypot is exactly the tell §8 forbids. The
schema keeps accepting it; the route decides what to do with it.

**Identical means identical, including `resumeSent`.** The success body varies
(`resumeSent: true | false` by what the submitter ticked). A rejection that always
returns `true` is distinguishable to any bot that submits with the box unticked.
Mirror the parsed `requestResume` value.

**Where the check sits in the order matters.** §8's FR-7 diagram puts the honeypot
after validation. Since the schema accepts `_website`, validation can still return
a `400` to a bot that also sent a bad email — decide deliberately whether a tripped
honeypot short-circuits ahead of validation, and record the reasoning. Timing is
also a weak tell: the rejection returns without two Resend round-trips, so it is
measurably faster. Note it; do not build fake latency for it.

**Treat whitespace as empty.** A trimmed-empty `_website` is not a trip — browser
autofill and password managers can put junk in a field a human never saw, and a
false positive here is a silently lost recruiter lead, which FR-7a calls worse
than no gate.

**Log the rejection server-side.** The bot sees success; the owner needs to see
that mail was suppressed, or a misfiring honeypot looks like zero inbound traffic.
Match the existing `console.info('[contact] …')` style in the route.

**Carried forward from the last contact feature and still true after this one:**
the route still has no rate limit and no captcha, so the Resend quota is still
reachable by anything that can POST valid JSON with an empty `_website`; and when
the limit does land, **do not use a module-level `Map`** — §8 warns each invocation
may be a fresh instance.

Testing follows CLAUDE.md: `src/lib/*.test.ts` only, `environment: "node"` — the
route handler itself is not unit-tested, so the logic has to leave the route to be
testable at all.

## History

### Sugbo Rentals Replaces Accu-Glass in the Featured Grid — completed 2026-09-14

Sugbo Rentals took the third featured slot. **Accu-Glass Products was not
dropped** — it moved down to `additionalLeadProjects` as the first text link,
keeping its live URL and its case study. `excludedFromPortfolio` was the wrong
home for it: that list is for entries that fail a click, and this one passes.
The featured row is now three Next.js builds, which costs the portfolio its
headless-Drupal-at-B2B-scale story on the front page; the case study is where
that survives.

`www.sugborentals.com` was verified live before the entry was written (rule 1)
and **its `stack` names only what the response proves** — `x-powered-by: Next.js`
and `/_next/` chunks, Tailwind utility classes in the markup, `server: Vercel`.
TypeScript is almost certainly in it and is deliberately absent under rule 3,
recorded in the file header so nobody reads the omission as an oversight. The
description was written from the live site and covers what the marketplace
actually does: three drive modes, all-in peso pricing, host calendars, delivery
zones, payouts.

**Two things the swap dragged with it, and the second is the interesting one.**

`leadProjectCount` went 8 → 9. The heading derives it, so the site followed with
no edit — the derivation earning its keep for the third feature running. The
spec's *prose* copies of the number did not: Q10, the G-2 row, the
portfolio-contents row, the flowchart and the §6.7 recount note all said 8 and
"5 text links", and were updated by hand.

And the lede said **"Every URL verified August 2026."** A 2026-09 entry made that
false. It was the last hardcoded claim left in the section, sitting in the one
sentence whose whole job is to assert that the URLs were checked.
`formatVerifiedWindow()` now reads the window off `lastVerified` — "August–September
2026" today, a single month if they ever converge, a year on each end if the span
crosses one, and `""` so the caller can drop the sentence rather than print a
date-shaped blank. 6 new tests, 152 total. Worth noting for next time: the
derived-counts rule was written for numbers, and a **date in prose drifts exactly
the same way.**

Thumbnail captured at 1280×960 and resized to 800×600 — exactly 4:3, a pure
resize with no crop, the same method and the same `sharp` q=82 as the first
three. 35 KB. No component changed: `publicAssetExists()` switched the card to
`next/image` on its own.

152 tests pass, lint clean, build clean. Browser-verified at 1280 and 390: all
three cards render `<Image>` with `complete: true` and the right alt text, 4:3
held (345×258 desktop, 333×250 mobile), the lede reads "August–September 2026",
Accu-Glass leads the text-link list, and no horizontal overflow at either width.

**Carried forward — not done in this feature:**

- **The resume PDF says 8/3 and the site now says 9/3.** This change widened
  that gap by one rather than closing it. §6.10's recount row is an ODT edit.
- **The Sugbo Rentals `stack` may be under-stating the build.** TypeScript, the
  database and the payment provider are all absent because nothing observable
  named them. One sentence from the owner closes it; rule 3 is why it was not
  guessed.
- **No case study at `/projects/sugbo-rentals`** — owner's call. The project
  ships as a card with a live link, which is the state FR-5 expects.
- **`caseStudies['accu-glass-products']` is still publishable and still
  unreachable.** `/projects/[slug]` does not exist yet, so the move changed
  nothing about it either way.
- **The Accu-Glass thumbnail is now an unused file**, joining the five paths
  already unused beside it — `additionalLeadProjects` has no image slot.
- **`public/romualdo-dasig-portrait.jpg` is still 5.5 MB.** Untouched again.

### Current Role Sync & PDF Re-export — completed 2026-08-30

The ODT's Jun 2026 – Present entry was rewritten and `experience.ts` followed it.
Three recycled bullets became six: AI-assisted development (Claude Code, v0), Drupal
10/11, JSON:API, **Next.js**, third-party APIs (Stripe, Resend), and CI/CD across
GitHub/Bitbucket, Docker, Vercel, AWS and GCP. `stack` follows rule 3 — every one of
its nine tags is named by the ODT *in that entry* — which is also why Angular and
Bitbucket Pipelines came off: the rewritten entry names neither.

**This closed the one conflict the previous sync deliberately left open**, and it
closed it the way §6.10 said it had to. The current role had been carrying the 2021
and 2018 freelance periods' bullets verbatim, so the Experience section read
Drupal-first while the hero and About led with Next.js. The fix went into the ODT, not
into a bullet written back into `experience.ts` — the whole point of naming the ODT the
source of truth is that a correction made anywhere else is a fifth place to drift from.
Both the §6.3 warning and the §6.10 row are now resolved rather than worked around.

The PDF was re-exported from the edited ODT with LibreOffice (`soffice --headless
--convert-to pdf`), verified page by page: 4 pages, portrait and links intact, SKILLS
correctly relocated below EMPLOYMENT EXPERIENCE. **194 KB, down from 301 KB**, which
also settles the attachment-size concern carried forward from the last feature — the
301 KB file was the DOCX-sourced export, and the DOCX is gone. `route.js.nft.json` was
re-checked and still names the PDF, so the serverless bundle will not `ENOENT` in
production only.

Two smaller corrections. The `experience.ts` header claimed two entries carry no
`stack` when only Bridge Technology Partners does. And the §6.10 PDF row still listed
the 8/3 project counts and the `https://` CebuFest link as outstanding; both were
already correct in the ODT, so that row is down to its last item.

The ODT's other change was layout: SKILLS / ABILITIES moved below EMPLOYMENT
EXPERIENCE and two of its lines were consolidated. No content file follows it —
`skills.ts` is already a superset of the ODT list, grouped by its own §6.5 scheme.

No code changed and no test changed. `src/lib/career.ts` reads only `start`, `end` and
`kind`, none of which moved, so "17+ years", the no-gaps claim and the career-bus
segments are untouched again — the derivation earning its keep for the second sync
running. 146 tests pass, lint clean, build clean. Browser-verified at 1280 and 390:
six bullets in order, nine tags wrapping onto one row at 1280 and several at 390, no
horizontal overflow.

**Carried forward — not done in this feature:**

- **The PDF's ABOUT ME still says "over 17 years"** where the spec standardises on
  "17+ years" (§0 item 5). This is now the *only* remaining §6.10 PDF item, and it is
  an ODT edit rather than a code change.
- **All twelve entries are still duty statements, not outcomes** (§6.10). Unchanged
  by this sync — the new bullets are more current but no more measured. The rewrite
  belongs in the ODT.
- **The PDF is committed, so the FR-7a gate still depends on the repo staying
  private.** Re-exporting a smaller file does not change that.

### Work History Sync from ODT — completed 2026-08-30

`private/romualdo-dasig-resume.odt` is now the declared source of truth for §6.3, and
`src/content/experience.ts` was rewritten against it. It had drifted further than
expected: **eleven of twelve entries changed.** Two were wrong rather than merely thin
— **Peregrine Consulting Group was the IoT engagement** (device prototypes, an MQTT
gateway, Google Cloud IoT Core, Angular, Laravel) and carried the bullet "Drupal
development for US client work" with a `['Drupal', 'PHP']` stack; the ODT names no
Drupal there at all. And **True Apex is "Software Engineer"** — the site had been
carrying "Web Designer and Developer", a title inherited from the pre-rebuild site
that the ODT has never agreed with. Also corrected: ScriptLance's role (Web Developer,
not Software Engineer), four locations that were abbreviated, and the education line,
which regains San Jose.

The one conflict was the current role, and it was the owner's call: the ODT gives
Jun 2026 – Present the same three Drupal/Angular/CI-CD bullets it gives the 2021 and
2018 freelance periods, and names no Next.js. Taken literally, so the Next.js bullet
and the Next.js/React/TypeScript/Vercel tags came off. **The Experience section's
current role now reads Drupal-first while the hero and About lead with Next.js** —
recorded in §6.10 as an ODT fix, because writing the bullet back into `experience.ts`
is how the two artifacts drift apart again.

The rule that made `stack` tractable is written into the file header: **a tag may only
name a technology the ODT names in that entry** — its own bullets or its role title.
The resume's global SKILLS list licenses nothing. That rule is what removed Twig,
MySQL and Jenkins CI from Dentsu and WordPress from True Apex; those were attributions
nobody had a source for. Bridge Technology Partners now carries no `stack`, correctly.

Every bullet is the ODT's wording with a terminal period added, which cost the site
two lines of its own voice — the ScriptLance entry's "the hardware-to-software
transition, visible in the overlap". The overlap still shows without the sentence:
that entry starts Nov 2008 against a Teradyne role running to Oct 2010. The comment
now says so instead of the page.

No code changed and no test changed. `src/lib/career.ts` reads only `start`, `end` and
`kind`, none of which moved, so "17+ years", the no-gaps claim and the career-bus
segments are all untouched — which is the derivation working. 146 tests pass, lint
clean, build clean. Browser-verified at 1280 and 390: 12 entries in order, every
bullet and tag as intended, the earlier-career `<details>` and education line correct,
no horizontal overflow.

`private/romualdo-dasig-resume.docx` was deleted with the owner's agreement. Nothing in
the repo referenced it, and once §6.3 names the ODT as the source of truth a third copy
of the same resume is a fourth place for the work history to drift.

**Carried forward — not done in this feature:**

- **All twelve entries are duty statements, not outcomes** (§6.10). Syncing verbatim
  made this uniform rather than partial. The rewrite belongs in the ODT.
- **The ODT itself needs the Next.js line** for the current role, plus the three
  remaining PDF items in §6.10 (8/3 project counts, `https://` CebuFest link,
  "17+ years"). Entry order is now correct in the ODT and needs no further fix.
- **The PDF in `private/` is 301 KB**, up from 186 KB at the last re-export. It is the
  file `POST /api/contact` attaches, so the size is a delivery concern.

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

### Resume Request & Delivery — completed 2026-08-26

The form was markup. It now validates, posts to `POST /api/contact`, and the route
emails the PDF to the requester and a lead notification to the owner with
`Reply-To` set to the submitter — G-4 and G-5, the two goals the whole rebuild
exists for. Verified against the live Resend API rather than a stub: 200, both
emails away in 1.8s. The §8 failure rows were exercised with curl (400 on empty
body, bad email, malformed JSON, oversized payload; 405 on GET), and the
`resumeSent:false` path returns 200 with no attachment.

**The interesting decision is `zod/mini`.** The schema is imported by a Client
Component, so whatever it imports ships to the browser. Classic zod measured
**+69.3 KB gzipped** against a 120 KB budget the framework floor already exceeds —
the `z` namespace does not tree-shake. The same schema in `zod/mini`, identical
behaviour and every test unchanged, is **+15.7 KB**. So the functional
`.check(z.trim(), z.minLength(2))` style in `contact-schema.ts` is load-bearing
rather than taste, and the file says so at the top: measure before switching back.
This also produced the baseline the previous feature said was missing — **176.7 KB
gz on `main`**, summed from gzipped `.next/static/chunks/*.js`, because Next 16
with Turbopack prints no First Load JS figure. Reproduce with a `git worktree` and
a *copied* `node_modules`; a symlink fails under Turbopack with "points out of the
filesystem root".

Two failure modes were closed by checking rather than assuming. The PDF is read
through `process.cwd()`, so Next's tracing cannot see it and the serverless bundle
would ship without it — `route.js.nft.json` was inspected and does name
`private/romualdo-dasig-resume.pdf`. And the gate itself: no `href` in the served
HTML contains pdf, resume, or download, and all three plausible static paths 404.
Both would have failed silently in production only.

The route is a Route Handler rather than a Server Action because §8 specifies
status codes and 403/429 stay reserved for the spam controls that follow. Both
sends use `allSettled`, not `all` — if the requester's copy bounces the owner
still gets the lead. Resend reports provider errors in the resolved value rather
than by rejecting, so a settled promise is not a delivered email and the check
looks at `.error`.

`/privacy` landed with it, because FR-6 wants the consent checkbox linked and an
unlinked one is uninformed consent. It describes a mailbox, not a retention policy
the setup cannot enforce (§9.5).

Browser-verified at 1280 and 390: blur validation wires `aria-invalid` and
`aria-describedby`, an empty submit shows all four errors and makes no request, the
success state replaces the form and names the address, and a forced 500 keeps the
form with its values intact behind a `mailto:` prefilled with the user's own
message. 88 new tests, 146 total.

**Carried forward — not done in this feature:**

- **The route has NO spam protection.** Owner's call: Turnstile, the Upstash rate
  limit, and the honeypot rejection are all deferred. Any script that can POST JSON
  can make the server send mail; the exposure is the **Resend quota and sender
  reputation**, not the PDF, which is forwardable by design. Safe only while the URL
  is unknown. **This is the next feature, before `/#contact` is linked anywhere.**
  When the limit lands, do not substitute a module-level `Map` — §8 warns each
  invocation may be a fresh instance, and a decorative limit is worse than none.
- **`EMAIL_FROM` is still `onboarding@resend.dev`.** The sandbox sender delivers
  only to the Resend account address; every recruiter's copy is rejected with a 403.
  Confirmed by observation, not inference. A verified domain at resend.com/domains
  is a launch prerequisite. Configuration, not code — the route reads the env var.
- **The PDF is now committed**, so the FR-7a gate depends entirely on the Bitbucket
  repo staying private. Making it public later leaks the file retroactively even if
  it is deleted first. (§11.1 names `raw.githubusercontent.com`; the Bitbucket
  equivalent applies.)
- **`https://www.dasigr.com/romualdo-dasig-resume.pdf` is still live on the old
  host.** The 301 in `next.config.ts` does not exist yet, and a redirect alone is
  not enough — the file must be deleted from the origin and any CDN cache at
  cutover, confirmed with a direct request against production.
- **FR-6's 60-second client throttle is deliberately absent.** On success the form
  is replaced so it cannot fire; on the error path it would lock a recruiter out for
  a minute because *the server* failed, which is the lost lead FR-7a calls worse
  than no gate. The in-flight guard covers the double-click it was really for.
- **`_website` is sent and ignored.** The input stays so the rejection is a two-line
  change later. The form comment says the check is not live, so nobody reads the
  field's presence as protection.
- **`public/romualdo-dasig-portrait.jpg` is still 5.5 MB.** Untouched again.

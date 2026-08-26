# Current Feature

## Status

**Not Started.** No feature in progress.

## Goals

<!-- What success looks like, as bullets. Filled in by `/feature load`. -->

## Notes

<!-- Additional context, constraints, or details from the spec. -->

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

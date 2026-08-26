# Current Feature: Project Screenshots

## Status

**In Progress.** Branch `feature/project-screenshots`.

## Goals

- Capture the homepage of each featured project's live site — cebufest.com,
  pvsystemtek.com, accuglassproducts.com — and land a WebP at the path
  `mock-data.ts` already names for it (`/images/projects/{slug}.webp`).
- All three featured cards render a real `next/image` thumbnail instead of the
  "Screenshot pending" placeholder, with no change to `ProjectCard`.
- Images are 800×600 (4:3, matching `aspect-4/3` on the card) and weigh little
  enough that the Projects section does not become the heaviest thing on the page.
- Each screenshot shows the site as it is today; `lastVerified` in `mock-data.ts`
  stays truthful, and any site that has changed or died gets handled under the
  §6.6 rules rather than screenshotted anyway.

## Notes

**Scope is the three featured projects, not all eight.** Only `featuredProjects`
renders `ProjectCard`; `additionalLeadProjects` renders as a text-link list with
no image, so a screenshot for Pass Labs, Duniway, BGW, ElexParts, or Trip to
Philippines would have nowhere to appear. Those thumbnail paths stay unused —
that is not a gap to fill in this feature.

**No code change should be needed.** `publicAssetExists()` in
[src/lib/assets.ts](src/lib/assets.ts) already switches a card from placeholder to
`<Image>` the moment a file lands at the named path. That is the design; if this
feature ends up editing `ProjectCard`, something has gone wrong. The one thing to
confirm is that `existsSync` runs at build time — the page is statically
generated — so a newly added file needs a rebuild, not just a refresh.

**The alt text is already written**: `Screenshot of the {title} home page`. The
screenshot has to actually be the home page for that to stay true.

**Capture mechanics to settle during `start`:**

- Playwright MCP is available. Viewport wants to be wide enough to get the
  desktop layout (1280) but the stored file is 800×600, so it is a resize or a
  crop, not a full-page capture — a full-page screenshot of a long marketing page
  squeezed into 4:3 is unreadable.
- Cookie banners, chat widgets, and consent overlays are the usual thing that
  ruins these. Dismiss or wait them out before capturing.
- Playwright writes PNG; converting to WebP needs a tool decision (`sharp` is not
  a dependency yet, macOS `sips` does not do WebP, `cwebp` may not be installed).

**Carried forward from Single Page Application** — the two related items in
History: thumbnails do not exist (this feature), and
`public/romualdo-dasig-portrait.jpg` is 5.5 MB and worth downscaling (not this
feature).

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

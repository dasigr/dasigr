# Current Feature: Active Navigation Link

## Status

**In Progress.** Branch `feature/active-navigation-link`.

## Goals

- Clicking a nav link marks that link as active in the header, on both the desktop
  row and the open mobile menu, and clears the previously active one.
- The active state is visible without relying on colour alone, and survives the
  smooth scroll to the section (it is not a `:active`/`:focus` flash).
- The active link is announced: `aria-current="true"` on the anchor, so a screen
  reader reports which section the reader is in rather than only which link was
  last pressed.
- Landing on `/#projects` directly — a pasted or shared hash URL — shows Projects
  active on first paint, not just after a click.
- The nav array stays derived from `buildSections()`; no section id is written down
  a second time to drive the highlight (the Testimonials gate must still remove the
  item cleanly).
- First Load JS does not regress: no new `'use client'` boundary. The highlight
  lives inside the existing `SiteHeader` client component.
- Any branching that decides "which section is active" lives in `src/lib/` with
  Vitest coverage, not inline in the component.

## Notes

**Scope as asked is click-driven.** The request is "indicate the active link when
you click it". The obvious neighbour is scroll-spy — the highlight following the
reader as they scroll past sections without clicking anything. These conflict at one
point: a click sets Projects active, then the smooth scroll passes About/Skills/
Experience on the way, and a naive scroll-spy repaints the highlight three times
before settling. Decide up front:

- _Click-only_ — smallest change, no observer, but scrolling by wheel leaves the
  highlight stale and lying about where the reader is.
- _Click + `IntersectionObserver`_ — correct in both directions, needs the click to
  suppress observer updates until the scroll settles.

Default assumption if nothing is said: **click + IntersectionObserver**, because a
stale highlight is worse than none on a single page whose whole navigation model is
scrolling.

**Built as click + scroll-spy, but not with `IntersectionObserver`.** Making IO
answer "which section is at the reading line" needs a root collapsed to a 1px band
via `rootMargin` — which is expressed in px, so the observer has to be torn down and
rebuilt on every resize, and the answer still comes back as "entered/left" rather
than "which one". A `passive` scroll listener coalesced into one
`requestAnimationFrame` reads six `getBoundingClientRect()`s per frame and hands them
to a pure function; that function is the part worth testing, and it is testable
either way. IO would have been indirection, not savings.

**Travel is released by the scroll settling, not by a timer.** A jump holds the
highlight on its target and ignores everything the scroll passes on the way. It is
released when the target is reached — or, if it never is, 120ms after scroll events
stop. That second case is real and was caught in the browser: a hash change that
produces no scroll at all left the highlight stuck on the target under a fixed
expiry.

**Touch points**

- [src/components/layout/site-header.tsx](src/components/layout/site-header.tsx) —
  the only `'use client'` boundary in the chrome; the nav `<ul>` at L79–100 renders
  both the desktop row and the mobile panel from one array, so one change covers
  both. The `Get My Resume` CTA also points at `#contact` and must **not** pick up
  the active treatment.
- [src/lib/navigation.ts](src/lib/navigation.ts) — `buildNavItems()` already emits
  `href: '#id'`; the active check should compare against section ids from here.
- `#top` (the brand link) is not a section in `BASE_SECTIONS` — Hero has no nav item
  and no number. Clicking the brand should clear the highlight rather than fail to
  match.

**Constraints**

- Hash-only navigation; these are anchors on one page, not routes. Do not reach for
  `usePathname`/`useSelectedLayoutSegment`.
- React Compiler is on — no hand-added `useMemo`/`useCallback`/`memo`.
- Tailwind v4, CSS-based config; any new token goes in `@theme` in
  [src/app/globals.css](src/app/globals.css).
- The sticky header offsets scroll position — whatever decides "which section is in
  view" has to account for `--header-height`, the same way the existing
  `scroll-margin` does.
- `prefers-reduced-motion` users get an instant jump rather than a smooth scroll;
  the settle logic must not assume an animation ran.

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

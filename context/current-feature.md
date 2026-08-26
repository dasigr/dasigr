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

# Current Feature: Single Page Application

## Status

**In Progress.** Branch `feature/single-page-application`. Page built and verified in
the browser; `npm run test` (43 tests), `npm run build`, and `npm run lint` all pass.
One goal is not met and cannot be — see *First Load JS* under Notes.

## Goals

- Build `src/app/page.tsx` as the seven-section single page from
  [prototype/index.html](prototype/index.html): Hero · About · Skills · Experience ·
  Projects · Testimonials · Contact — hash anchors, not routes.
- Port the prototype's visual design (dark palette, career bus, timeline, card grid,
  quote grid) to Tailwind v4 tokens in `@theme` inside `src/app/globals.css`. No
  `tailwind.config.ts`.
- Render Projects, Testimonials, and their derived counts from
  [src/lib/mock-data.ts](src/lib/mock-data.ts) — never hardcode the numbers or the
  quote list. Copy interpolates `leadProjectCount` / `maintenanceClientCount`;
  Testimonials renders from `publishableTestimonials` and the section *and its nav
  item* disappear when `hasTestimonials` is false.
- Working navigation: header nav links scroll to their sections, mobile menu toggles,
  skip link works, "Back to top" works. The nav array is derived, not hardcoded.
- Contact form is **visual UI only** — renders every field, but does not submit. No
  server action, no `POST /api/contact`, no Zod wiring in this feature.
- Use the real portraits from `public/` — `romualdo-dasig-portrait.jpg` and
  `romualdo-dasig-profile.jpg` — via `next/image` in Hero and About, replacing the
  prototype's placeholder blocks.
- All dates, employers, locations, and the years-of-experience claim match the resume.
- Section components are Server Components; only the header nav is `'use client'`.
  First Load JS for `/` stays under 120 KB gzipped.
- `npm run build` and `npm run lint` pass.

## Notes

**Scope boundaries.** This is the page shell and its content. Explicitly *not* in
this feature: the contact server action / route handler, Zod schema, Turnstile,
Resend, the gated resume PDF, `/projects/[slug]` case-study routes, and the
scroll-reveal wrapper. The "Get My Resume" CTA scrolls to `#contact` and stops there.

**Testing.** [context/ai-interaction.md](context/ai-interaction.md#testing) scopes
Vitest to `src/{actions,lib}/**/*.test.ts`. If this feature adds no server action and
no new `src/lib` utility, no test setup is required. If it adds one — a nav-derivation
helper is the likely candidate — that change must also land the missing Vitest setup
(`vitest.config.mts`, `environment: "node"`, `resolve.tsconfigPaths: true`, the
`include` glob above, plus the `test` / `test:watch` scripts).

**Resume consistency — source of truth.** The PDF at
[docs/RomualdoDasigResume.pdf](docs/RomualdoDasigResume.pdf) could not be text-extracted
in this environment (no `poppler`; `mdls` returns null). Use §6.4 of
[context/project-overview.md](context/project-overview.md) as the reconciled record —
it already carries the full employment table checked against the PDF, plus the two
known discrepancies:

- Standardise on **"17+ years"** / *"building for the web since 2008"*. Not "~18",
  not "more than 15". Nov 2008 → Aug 2026 is 17 years 9 months.
- The PDF prints the `Nov 2018 – Jun 2019` freelance entry *above* Zyrous
  (`Jul 2019 – Dec 2020`), breaking reverse-chronological order. The site order is
  correct; the PDF is the artifact that needs fixing. Do not copy the PDF's order.

Run `brew install poppler` if a direct PDF read becomes necessary.

**Prototype content to fix, not port.** The prototype's Experience section carries
`PLACEHOLDER` and `TODO` bullets for Dentsu, Peregrine, Zyrous, and two freelance
periods (§6.10 flags these as duty statements needing outcomes). Porting them verbatim
puts the literal word PLACEHOLDER on the page. Either write real bullets with the owner
or omit those bullets — decide at `start`.

**Prototype artifacts to drop.** The yellow "STATIC PROTOTYPE" banner, the
`noindex, nofollow` meta, `onsubmit="return false;"`, and the "this button does
nothing" caption are prototype scaffolding. The CSS checkbox mobile-nav hack becomes a
real `'use client'` toggle. `#` placeholder hrefs become real URLs from mock-data
(`liveUrl`) and real social links.

**Testimonials caveat.** The three quotes that render are the **fictional** fixtures
from mock-data.ts, present so the section can be built and seen. The four real entries
have no consent and correctly filter out. These fixtures must not survive to
production — that is a content swap, not a code change.

**Case studies.** `isPublishable()` passes for all three mock case studies, so
`caseStudySlugs` is non-empty — but `/projects/[slug]` is out of scope here, so project
cards ship link-less. That is the expected state for this feature.

## Decisions taken at `start`

- **Placeholder bullets omitted.** Entries that had only `PLACEHOLDER`/`TODO` bullets
  (two freelance periods) now render with no bullet list; Dentsu, Peregrine, and Zyrous
  keep their real bullets and lost the placeholder one. §6.10 still wants outcomes
  written for those three.
- **Social URLs confirmed by the owner:**
  `linkedin.com/in/romualdo-dasig-55937723` and `github.com/dasigr`.
- **All maintenance clients are past work.** The owner corrected this mid-build: Seiwa
  Optical America and Arctic Zero are *previous*, not ongoing, alongside Pro-Physik.
  `MaintenanceClient` gained a rendered `status` field, and the current freelance
  entry's "ongoing maintenance for two long-running WordPress clients" bullet was
  removed as a live overclaim.

## Open items for `review`

- **First Load JS is 176 KB gzipped against a 120 KB budget — the goal is not met.**
  Measured from the prerendered HTML's script tags. The framework floor accounts for
  169 KB of it: `/_not-found`, which contains none of this feature's code, measures the
  same 169 KB. SiteHeader — the only `'use client'` boundary — adds 7 KB. Next 16.3.3
  with Turbopack also no longer prints a First Load JS figure in `next build` output,
  so the tracked-budget workflow in CLAUDE.md needs rebasing on a real measurement
  either way. Nothing in this feature's code can close a 49 KB gap.
- **Project thumbnails do not exist.** All eight cards render a "Screenshot pending"
  placeholder. `publicAssetExists()` switches each card to `next/image` the moment a
  WebP lands at the path named in mock-data — no code change needed.
- **`public/` and `docs/` are untracked.** The two portraits the page renders are not
  in git yet; the site will not build the same on a fresh clone until they are.
- **Case-study links are absent by design.** `caseStudySlugs` is non-empty, but
  `/projects/[slug]` does not exist, and a link to it would be the dead link FR-5
  forbids. The guarded link belongs in `ProjectCard` when that route lands.
- **Testimonials are the fictional fixtures.** Content swap, not a code change.

## History


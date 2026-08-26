# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build — First Load JS figure here is a tracked budget (see below)
npm run start    # production server
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

Node version is pinned in `.nvmrc` (v24.18.0).

**Testing is specified but not yet wired up.** [context/ai-interaction.md](context/ai-interaction.md#testing) mandates Vitest with `npm run test` / `npm run test:watch` and a `vitest.config.mts`, but neither the dependency, the scripts, nor the config exist yet. The first change that adds a server action or `src/lib` utility must also add that setup: `environment: "node"`, `resolve.tsconfigPaths: true`, and `include: ["src/{actions,lib}/**/*.test.ts"]` — that glob deliberately makes it impossible for a component test to join the suite.

## What this repo is

`dasigr.com` v2 — a single-page portfolio / online resume. **The current tree is a bare `create-next-app` skeleton** (`src/app/{layout,page,globals.css}` only); essentially everything described below is still to be built.

The full specification lives in [context/](context/) and is the source of truth for what to build:

| File | Contents |
|---|---|
| [context/project-overview.md](context/project-overview.md) | The spec — architecture, content model, FR-1…FR-10, API contract, non-functional budgets. Read the relevant § before implementing a feature. |
| [context/coding-standards.md](context/coding-standards.md) | TypeScript / React / Next / Tailwind conventions and file organization |
| [context/ai-interaction.md](context/ai-interaction.md) | Per-feature workflow, testing scope, branching, commit rules |
| [context/current-feature.md](context/current-feature.md) | The feature currently in flight, plus a history log. Updated at the start and end of each feature. |

All application code lives under `src/` (`@/*` → `./src/*` in `tsconfig.json`): `src/app/`, `src/components/[feature]/`, `src/content/`, `src/actions/`, `src/lib/`, `src/types/`. Import by alias, not relative path. `public/` and `private/` stay at the repo root — Next.js only serves static assets from the root, and `private/` is read via `process.cwd()` (spec §11).

## Architecture that isn't obvious from one file

**One page, seven sections, hash anchors — not seven routes.** `src/app/page.tsx` composes Hero · About · Skills · Experience · Projects · Testimonials · Contact, addressed as `/#projects` etc. Case studies are the one exception: `/projects/[slug]`, statically generated, because the engineering-manager audience for those is different from the recruiter audience for the page (spec §5.1).

**Content lives in typed `.ts` files, not a database.** No DB in v1. The Prisma schema in §6.6 is a v1.1 sketch — do not build against it.

**Three derived exports are hard gates. Nothing may bypass them:**

- `publishableTestimonials` / `hasTestimonials` — a testimonial with `consentObtained: null` must never render, and the Testimonials section *and its nav item* disappear entirely when nothing is publishable. The nav array is derived, never hardcoded.
- `isPublishable()` / `caseStudySlugs` — drives `generateStaticParams()`. Unwritten case studies produce no route and project cards ship link-less. **Zero published case studies is the expected launch state, not a bug.**
- `leadProjectCount` / `maintenanceClientCount` — copy interpolates these instead of hardcoding numbers, because the site and the resume have already drifted apart once (11/11 vs 8/3).

**The resume PDF is gated, and the gate is fragile in three specific ways.** `POST /api/contact` emails the PDF; there is no download link anywhere — not in nav, footer, About, or OG metadata. Consequences to keep in mind: the PDF lives in `private/` (outside `public/`), so `outputFileTracingIncludes` must include it or the route throws `ENOENT` in production only; the route needs `runtime = 'nodejs'` (Edge can't read the filesystem) and an explicit `maxDuration` (two Resend calls + Turnstile + Redis); and **the repo must stay private** while the PDF is committed, or `raw.githubusercontent.com` serves it publicly and the gate is decorative.

**Server/Client boundary is the performance budget.** Every section is a Server Component; only the header nav, the contact form, and the scroll-reveal wrapper are `'use client'`. First Load JS for `/` must stay **under 120 KB gzipped** — any regression in the `next build` figure traces to a new `'use client'` boundary.

**Validate twice with one schema.** The Zod schema in `src/lib/` is imported by both the contact form and the route handler. Client validation is UX; server validation is the control. The honeypot rejection must return a response byte-identical to a success (§8), or the bot learns it was caught.

## Conventions worth stating

- **Tailwind CSS v4** — CSS-based config only. Never create `tailwind.config.ts`/`.js`; theme goes in `@theme` inside `src/app/globals.css`. Dark mode first.
- **React Compiler is on** (`reactCompiler: true` in `next.config.ts`) — don't hand-add `useMemo`/`useCallback`/`memo` for routine memoization.
- **Next 16 typed routes** — `layout.tsx` uses the generated `LayoutProps<"/">` helper rather than a hand-written props type. Prefer these generated helpers.
- No `any`; strict mode. Server Actions return `{ success, data, error }`.
- Testable logic belongs in `src/lib/*`, not inside components — branching, parsing, and formatting move out so they can be unit-tested.

## Workflow expectations

From [context/ai-interaction.md](context/ai-interaction.md) — these override default behaviour:

1. Document the feature in [context/current-feature.md](context/current-feature.md) first.
2. Branch: `feature/[name]` or `fix/[name]`.
3. Implement, then verify in the browser and add/update Vitest tests for any new server action or `src/lib` utility.
4. `npm run test` and `npm run build` must both pass before committing. If either fails, fix it — don't commit around it.
5. **Ask before committing.** Conventional commit messages (`feat:`, `fix:`, `chore:`). Never include "Generated with Claude" or co-author trailers.
6. After merge, ask before deleting the branch, then mark the feature complete in `current-feature.md` and add it to History.

Ask before large refactors or architectural changes. Never delete files without clarification. If something isn't working after 2–3 attempts, stop and explain rather than trying more fixes.

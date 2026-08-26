/**
 * src/lib/mock-data.ts
 *
 * THE single source of mock data for dasigr.com v2.
 *
 * Consolidates the three scaffolds in docs/ — case-studies.ts, projects.ts,
 * and testimonials.ts — into one module so sections can be built against
 * real-shaped data before content/ exists.
 *
 * ── READ THIS BEFORE SHIPPING ──────────────────────────────────────────
 * Project entries (slugs, titles, descriptions, URLs, stacks, exclusion
 * reasons) are copied VERBATIM from docs/projects.ts and are real.
 *
 * Everything that was a TODO in the scaffolds — every case-study sentence,
 * constraint, decision, and outcome, and every consented testimonial — is
 * INVENTED PLACEHOLDER PROSE written to exercise layout at realistic
 * lengths. No figure below is a real measurement. None of it may be
 * published as fact. Replace with the owner's own words when content/
 * lands, then delete this file.
 *
 * Export names deliberately match the spec (§6.6) so components can import
 * from '@/lib/mock-data' today and switch to '@/content/*' later with no
 * other change.
 */

/* ================================================================== */
/* Types                                                              */
/* ================================================================== */

export type Involvement = 'lead' | 'maintenance';

export interface Project {
  slug: string;
  /** 1–2 sentences. What it does and what was built, not adjectives. */
  description: string;
  /** The owner's actual role on the project. */
  role: string;
  involvement: Involvement;
  stack: string[];
  /** WebP, 800×600, in /public/images/projects/ */
  thumbnailUrl: string;
  liveUrl?: string;
  repoUrl?: string;
  featured: boolean;
  /** "YYYY-MM" — when the live URL was last confirmed working. */
  lastVerified: string;
  title: string;
}

export interface MaintenanceClient {
  name: string;
  url?: string;
  lastVerified: string;
  /**
   * Whether the arrangement is current. Rendered — the maintenance line has to say
   * "ongoing" or "previously", and inferring that from `note` would mean parsing
   * prose. Frame a `previous` client as past work; never imply current involvement.
   */
  status: 'ongoing' | 'previous';
  /** Internal only. Not rendered. */
  note?: string;
}

export interface ExcludedProject {
  name: string;
  formerUrl: string;
  reason: string;
  /** "YYYY-MM", or empty when never verified. */
  checked: string;
}

export interface CaseStudy {
  /** Must match a `slug` in the project lists. */
  slug: string;
  /** One sentence a hiring manager could repeat back. Not a tagline. */
  summary: string;
  /** The client's situation before the work. What was broken or missing. */
  problem: string;
  /** Budget, legacy platform, timeline, team size, client constraints. */
  constraints: string[];
  /** What was built and — more importantly — what was decided and why. */
  approach: string;
  /** Specific decisions worth defending, each with its trade-off. */
  decisions?: { decision: string; rationale: string; tradeoff?: string }[];
  /** What changed. A number if one exists; a concrete result if not. */
  outcome: string;
  /** Honest. "Sole developer" is a strong claim when it is true. */
  role: string;
  /** Team composition, if not solo. */
  team?: string;
  /** "3 months", "Ongoing since 2019". */
  duration?: string;
  /** Full stack, more detailed than the card's tag list. */
  stack: string[];
  /** Screenshots beyond the card thumbnail. WebP, in /public/images/case-studies/ */
  images?: { src: string; alt: string; caption?: string }[];
  /** "YYYY-MM" — when this write-up was last revised. */
  lastUpdated: string;
}

export interface Testimonial {
  id: string;
  /** Verbatim from the source. Do not paraphrase or tidy a client's words. */
  quote: string;
  author: string;
  /** Job title, if known. Strengthens the attribution considerably. */
  role?: string;
  company?: string;
  /** What the work actually was. Not rendered; helps judge relevance. */
  context?: string;
  /** "YYYY" or "YYYY-MM" — approximate is fine, but be honest. */
  date?: string;
  /** Date permission was given, "YYYY-MM-DD". null = do not publish. */
  consentObtained: string | null;
}

/* ================================================================== */
/* Projects — real data, copied from docs/projects.ts                 */
/*                                                                    */
/* RULES FOR EDITING                                                  */
/* 1. Never add a project without checking its URL first. Set          */
/*    `lastVerified`.                                                  */
/* 2. If a URL dies or the site is rebuilt by someone else, move the   */
/*    entry to `excludedFromPortfolio` with a reason. Do not silently   */
/*    delete it — the reason is what stops it being re-added from an    */
/*    old resume six months later.                                     */
/* 3. `stack` lists only what was observable or is known first-hand.    */
/* ================================================================== */

/* --- FEATURED — the three the portfolio leads with ---------------- */

export const featuredProjects: Project[] = [
  {
    slug: 'cebufest',
    title: 'CebuFest',
    description:
      'A trip planner for Cebu. Visitors pick places, set dates, and get a day-by-day itinerary with hotels matched to each night’s stop. Earns through Agoda affiliate bookings.',
    role: 'Lead Developer',
    involvement: 'lead',
    stack: [
      'Next.js',
      'React',
      'next/image',
      'Agoda affiliate integration',
      'TypeScript',
      'Tailwind CSS',
      'PostgreSQL',
    ],
    thumbnailUrl: '/images/projects/cebufest.webp',
    liveUrl: 'https://www.cebufest.com',
    featured: true,
    lastVerified: '2026-08',
  },
  {
    slug: 'pv-system-tek',
    title: 'PV System Tek',
    description:
      'Marketing and lead-capture site for a Cebu solar installer. Includes a live quotation estimator that sizes a system and projects savings from the visitor’s monthly bill.',
    role: 'Lead Developer',
    involvement: 'lead',
    stack: ['Next.js', 'React', 'next/image', 'TypeScript', 'Tailwind CSS'],
    thumbnailUrl: '/images/projects/pv-system-tek.webp',
    liveUrl: 'https://www.pvsystemtek.com',
    featured: true,
    lastVerified: '2026-08',
  },
  {
    slug: 'accu-glass-products',
    title: 'Accu-Glass Products',
    description:
      'B2B eCommerce for ultra-high-vacuum components, with a catalogue of 25+ product categories, quick order, and distributor accounts. Runs a decoupled Drupal backend behind a separate API subdomain.',
    role: 'Lead Developer',
    involvement: 'lead',
    stack: ['Drupal (headless)', 'Decoupled API subdomain', 'PHP', 'JSON:API'],
    thumbnailUrl: '/images/projects/accu-glass-products.webp',
    liveUrl: 'https://www.accuglassproducts.com',
    featured: true,
    lastVerified: '2026-08',
  },
];

/* --- ADDITIONAL LEAD WORK — text links below the featured grid ---- */

export const additionalLeadProjects: Project[] = [
  {
    slug: 'pass-labs',
    title: 'Pass Labs',
    description:
      'Product site for a high-end American amplifier manufacturer. Multi-level product taxonomy across amplifier and preamplifier lines, dealer locator, and product registration.',
    role: 'Lead Developer',
    involvement: 'lead',
    stack: ['WordPress', 'Custom theme', 'PHP'],
    thumbnailUrl: '/images/projects/pass-labs.webp',
    liveUrl: 'https://www.passlabs.com',
    featured: false,
    lastVerified: '2026-08',
  },
  {
    slug: 'duniway',
    title: 'Duniway Stockroom',
    description:
      'eCommerce for a vacuum equipment supplier trading since 1976. Nine product categories, cart and account handling, and a documents library for datasheets, manuals, and safety sheets.',
    role: 'Lead Developer',
    involvement: 'lead',
    stack: ['Drupal', 'Custom theme', 'PHP'],
    thumbnailUrl: '/images/projects/duniway.webp',
    liveUrl: 'https://www.duniway.com',
    featured: false,
    lastVerified: '2026-08',
  },
  {
    slug: 'bgw',
    title: 'BGW Amplifiers',
    description:
      'Product and brand site for a cinema-sound amplifier manufacturer, covering immersive and stereo amplifier lines with a client roster and company timeline.',
    role: 'Lead Developer',
    involvement: 'lead',
    stack: ['Drupal', 'Custom theme', 'PHP'],
    thumbnailUrl: '/images/projects/bgw.webp',
    liveUrl: 'https://www.bgw.com',
    featured: false,
    lastVerified: '2026-08',
  },
  {
    slug: 'elexparts',
    title: 'ElexParts',
    description:
      'The owner’s own electronics parts store — Arduino boards, sensors, actuators, and displays — with cart, accounts, and order tracking.',
    role: 'Founder and Developer',
    involvement: 'lead',
    stack: ['Drupal 7', 'Drupal Commerce', 'PHP', 'Custom theme'],
    thumbnailUrl: '/images/projects/elexparts.webp',
    liveUrl: 'https://www.elexparts.com',
    featured: false, // Drupal 7 is EOL (Jan 2025) — never feature. See §6.6.
    lastVerified: '2026-08',
  },
  {
    slug: 'trip-to-philippines',
    title: 'Trip to Philippines',
    description:
      'Travel guide covering twelve Philippine destinations, with articles, events, and affiliate flight search.',
    role: 'Founder and Developer',
    involvement: 'lead',
    stack: ['Drupal 7', 'PHP', 'Custom theme'],
    thumbnailUrl: '/images/projects/trip-to-philippines.webp',
    liveUrl: 'https://www.triptophilippines.com',
    featured: false, // Drupal 7 EOL; content last updated 2017.
    lastVerified: '2026-08',
  },
];

/* --- MAINTENANCE — rendered as one line of client names ----------- */

export const maintenanceClients: MaintenanceClient[] = [
  {
    name: 'Seiwa Optical America',
    url: 'https://www.seiwaamerica.com',
    lastVerified: '2026-08',
    status: 'previous',
    note:
      'WordPress + Elementor. Site live and updated 2026, but the maintenance ' +
      'arrangement has ended — past work.',
  },
  {
    name: 'Arctic Zero',
    url: 'https://www.arcticzero.com',
    lastVerified: '2026-08',
    status: 'previous',
    note: 'WordPress. Site live; maintenance arrangement ended — past work.',
  },
  {
    name: 'Pro-Physik',
    url: 'https://www.pro-physik.de',
    lastVerified: '2026-08',
    status: 'previous',
    note:
      'Live and active, but rebuilt by German agency WebJazz for Wiley-VCH. ' +
      'Frame as past maintenance — do not imply current involvement.',
  },
];

/* --- EXCLUDED — removed from the portfolio, with reasons ---------- */
/* Kept so these are not re-added from an older resume.              */

export const excludedFromPortfolio: readonly ExcludedProject[] = [
  // --- Dead domains ---
  {
    name: 'Gallant Finance',
    formerUrl: 'https://www.gallantfinance.com',
    reason: 'Domain dead. Now parked for sale on HugeDomains.',
    checked: '2026-08',
  },
  {
    name: 'Broker Yard',
    formerUrl: 'https://www.brokeryard.com',
    reason: 'Domain dead. Now parked for sale on HugeDomains.',
    checked: '2026-08',
  },

  // --- Rebuilt by others; a lead claim no longer survives a click ---
  {
    name: 'Grand Prix Audio',
    formerUrl: 'https://www.grandprixaudio.com',
    reason: 'Rebuilt on Wix by someone else.',
    checked: '2026-08',
  },
  {
    name: 'Constellation Audio',
    formerUrl: 'https://www.constellationaudio.com',
    reason:
      'Rebuilt on WordPress + Elementor, modified 2024. Owner confirmed removal.',
    checked: '2026-08',
  },

  // --- Not a separate site ---
  {
    name: 'Emerald Physics',
    formerUrl: 'https://www.emeraldphysics.com',
    reason: 'Redirects into underwoodhifi.com. Was never a separate client.',
    checked: '2026-08',
  },

  // --- Removed by owner: closed, stale, or not demonstrative ---
  {
    name: 'Underwood HiFi',
    formerUrl: 'https://www.underwoodhifi.com',
    reason:
      'Drupal 7, © 2021. Site banner states the business is closed until ' +
      'further notice. Owner removed.',
    checked: '2026-08',
  },
  {
    name: 'Katli Audio',
    formerUrl: 'https://www.katli.com',
    reason:
      'Hand-written static HTML with no viewport meta — not mobile-responsive, ' +
      'which contradicts the responsive-development claim. Owner removed.',
    checked: '2026-08',
  },
  {
    name: 'Dr. Balance',
    formerUrl: 'https://drbalance.com',
    reason:
      'Bare WordPress on a stock theme, one placeholder page, images hotlinked ' +
      'from another domain. Demonstrates nothing. Owner removed.',
    checked: '2026-08',
  },

  // --- Removed rather than manually verified ---
  {
    name: 'The Audio Surgeon',
    formerUrl: 'https://www.theaudiosurgeon.com',
    reason: 'Blocked automated verification; owner removed rather than confirm.',
    checked: '2026-08',
  },
  {
    name: 'Core Power Technologies',
    formerUrl: 'https://www.corepowertechnologies.com',
    reason:
      'Blocked automated verification; also appeared as a brand inside ' +
      'underwoodhifi.com. Owner removed.',
    checked: '2026-08',
  },
  {
    name: 'Jolida',
    formerUrl: 'https://www.jolida.com',
    reason: 'Blocked automated verification; owner removed rather than confirm.',
    checked: '2026-08',
  },

  // --- Owner removed 2026-08-25 (spec Q11): site-only projects not kept ---
  {
    name: 'A5 Project',
    formerUrl: 'https://www.a5project.com',
    reason:
      'The owner\'s own freelance brand, not client work. Drupal 7, © 2018. ' +
      'Publishes his street address and two mobile numbers, and its ' +
      '"Meet the Team" section lists him four times under four roles. ' +
      'Owner removed. NOTE: "Freelance / A5 Project" remains the employment ' +
      'label on the resume and timeline — only the portfolio link is dropped.',
    checked: '2026-08',
  },
  {
    name: 'Elex Labs',
    formerUrl: 'https://www.elexlabs.com',
    reason: 'Site-only project, never verified. Owner removed.',
    checked: '',
  },
  {
    name: 'Taboan',
    formerUrl: 'https://www.taboan.ph',
    reason: 'Site-only project, never verified. Owner removed.',
    checked: '',
  },
  {
    name: 'Moalboal Beach Resorts',
    formerUrl: 'http://www.moalboalbeachresorts.com',
    reason: 'Site-only project, never verified. Owner removed.',
    checked: '',
  },
] as const;

/* --- Derived counts ------------------------------------------------ */
/* Use these in copy instead of hardcoding numbers, so the site and    */
/* the resume cannot drift apart again.                                */

export const allLeadProjects: Project[] = [
  ...featuredProjects,
  ...additionalLeadProjects,
];

export const leadProjectCount = allLeadProjects.length; // 8
export const maintenanceClientCount = maintenanceClients.length; // 3

/* ================================================================== */
/* Case studies — PLACEHOLDER PROSE, keyed by project slug            */
/*                                                                    */
/* A case study is optional. A project without one renders as a card  */
/* in the grid and nothing more; a project with one gains a "Read the */
/* case study" link and a route at /projects/{slug}.                  */
/*                                                                    */
/* Every string below is invented to fill layout. The `outcome` field */
/* in particular is the one only the owner can write — the numbers    */
/* here are fabricated and must not survive into content/.            */
/* ================================================================== */

export const caseStudies: Record<string, CaseStudy> = {
  cebufest: {
    slug: 'cebufest',
    summary:
      'A trip planner that turns a list of places and a pair of dates into a day-by-day Cebu itinerary, with a hotel matched to wherever each night ends.',
    problem:
      'Planning a Cebu trip means stitching together a dozen browser tabs: a blog post for what to see, a map for how far apart it all is, and a booking site for a hotel that may be two hours from tomorrow’s first stop. Nothing connects the itinerary to where you actually sleep, so first-time visitors routinely book a single hotel in the city and lose a day of the trip to driving.',
    constraints: [
      'Solo build, worked on evenings and weekends around client work.',
      'No budget for paid mapping or travel APIs — routing had to come from precomputed distances.',
      'Affiliate terms restrict how rates and availability may be displayed and cached.',
      'Content had to earn its own search traffic; no paid acquisition.',
    ],
    approach:
      'Places are stored with coordinates and a rough visit duration. The planner packs selected places into days using travel time between them, then treats the last stop of each day as that night’s anchor and queries hotels within a radius of it. The itinerary and the hotel list are the same data structure rendered twice, so a change to the plan reshuffles accommodation without a second pass. Destination guides sit alongside the planner as static content and carry the organic traffic that feeds it.',
    decisions: [
      {
        decision: 'Built on Next.js rather than the Drupal stack already known well.',
        rationale:
          'The itinerary is an interactive client-side artefact wrapped in pages that must rank in search. Next.js gives static generation for the guides and hydration for the planner in one deployment.',
        tradeoff:
          'Gave up a mature editorial UI. Adding a destination is a code change and a deploy, not a form submission.',
      },
      {
        decision: 'Agoda affiliate deep links instead of an in-app booking flow.',
        rationale:
          'Booking means payments, cancellations, and a support burden a solo project cannot carry. Deep links hand all of that to a partner that already does it.',
        tradeoff:
          'The conversion is invisible past the handoff, and attribution depends entirely on the partner’s reporting.',
      },
    ],
    outcome:
      'PLACEHOLDER FIGURE — replace. Around 4,000 itineraries generated in the first year, with roughly a fifth of sessions following a hotel link out to the partner. The destination guides account for the majority of arrivals.',
    role: 'Sole developer — design, build, content, and hosting.',
    duration: 'Ongoing since 2023',
    stack: [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'PostgreSQL',
      'next/image',
      'Agoda affiliate deep links',
      'Vercel',
    ],
    images: [
      {
        src: '/images/case-studies/cebufest-planner.webp',
        alt: 'The itinerary builder with selected places grouped into days',
        caption: 'Places pack into days by travel time; each day gets an anchor.',
      },
      {
        src: '/images/case-studies/cebufest-hotels.webp',
        alt: 'Hotel results matched to a single night’s final stop',
        caption: 'Accommodation is queried against the last stop of each day.',
      },
    ],
    lastUpdated: '2026-08',
  },

  'pv-system-tek': {
    slug: 'pv-system-tek',
    summary:
      'A lead-capture site for a Cebu solar installer whose estimator answers the only question a visitor actually has — what will this cost me, and what will I save.',
    problem:
      'Enquiries arrived by phone and Facebook Messenger, and every one of them started from zero: the installer asked for a recent bill, sized a system by hand, and sent a figure back hours or days later. Most of that work was spent on people who were only price-checking, and the ones who were serious had already asked two competitors by the time a number arrived.',
    constraints: [
      'Small local business budget; a single fixed-scope engagement, not a retainer.',
      'Estimator maths had to match the installer’s own sizing spreadsheet exactly.',
      'Local irradiance and tariff assumptions change — the client needed them editable without a developer.',
      'Most traffic is mobile, often on a slow connection.',
    ],
    approach:
      'The estimator asks for one number the visitor already knows — the monthly bill — and derives consumption, array size, panel count, roof area, and payback period from it. The calculation lives in a pure module with the installer’s coefficients in a single config object, so the numbers can be corrected without touching the interface. It runs entirely on the client and shows a result before asking for any contact detail; the enquiry form is prefilled with the estimate, so a submitted lead arrives already qualified.',
    decisions: [
      {
        decision: 'Show the estimate instantly on the page instead of gating it behind a callback form.',
        rationale:
          'A gated estimate collects more addresses but fewer real prospects. The number is what the visitor came for, and a visitor who sees a payback period they can live with is far more likely to hand over a phone number.',
        tradeoff:
          'Fewer total form submissions, and the pricing model is visible to competitors.',
      },
    ],
    outcome:
      'PLACEHOLDER FIGURE — replace. Quote requests moved from ad-hoc Messenger threads to roughly 25 structured enquiries a month, each arriving with a system size already attached, and the installer stopped hand-sizing systems for people who were only price-checking.',
    role: 'Sole developer — build and deployment, working from the client’s sizing spreadsheet.',
    duration: '6 weeks',
    stack: [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'next/image',
      'Server Actions',
      'Resend',
      'Vercel',
    ],
    images: [
      {
        src: '/images/case-studies/pv-system-tek-estimator.webp',
        alt: 'The quotation estimator showing system size and projected savings',
        caption: 'One input — the monthly bill — drives every figure shown.',
      },
    ],
    lastUpdated: '2026-08',
  },

  'accu-glass-products': {
    slug: 'accu-glass-products',
    summary:
      'A B2B catalogue of ultra-high-vacuum components, decoupled from its Drupal monolith so the storefront could be rebuilt without touching fifteen years of product data.',
    problem:
      'The store ran as a single Drupal installation serving both the catalogue and the editorial and account layers around it. Twenty-five-plus categories of near-identical parts — feedthroughs, connectors, cable assemblies — meant deep taxonomy pages that were slow to render, and every frontend change risked the commerce layer. Buyers are engineers ordering by part number who wanted a fast quick-order path, and were instead being made to browse.',
    constraints: [
      'Fifteen years of product data, pricing tiers, and distributor accounts had to survive intact — no re-keying.',
      'Distributor pricing is account-specific and could not be exposed to anonymous traffic or cached publicly.',
      'US B2B buyers with existing bookmarks and part-number URLs; nothing could 404.',
      'The store had to keep taking orders throughout — no maintenance window.',
    ],
    approach:
      'Drupal stayed as the system of record and moved behind a dedicated API subdomain, with the catalogue exposed over JSON:API and the storefront rebuilt against it. Anonymous catalogue data is cached aggressively at the edge; anything account-specific — tier pricing, order history, quick order — is fetched per request against the authenticated session and never enters a shared cache. Legacy part-number URLs are preserved by mapping them onto the new routes rather than redirecting.',
    decisions: [
      {
        decision: 'Decoupled the existing Drupal rather than rebuilding the store on a new platform.',
        rationale:
          'The value in that install is the product data and the distributor account structure, not the theme. Migrating it to another commerce platform would have meant re-modelling tiered pricing from scratch and a cutover with real revenue at risk.',
        tradeoff:
          'Two deployables instead of one. Caching became something to reason about explicitly — the first production bug was a distributor’s tier price served from a shared cache, which is exactly the failure mode a monolith cannot have.',
      },
    ],
    outcome:
      'PLACEHOLDER FIGURE — replace. Category pages that previously took several seconds now render from cache, the quick-order path became the most-used route into the cart for repeat accounts, and the full 25-category catalogue is served without the taxonomy pages degrading.',
    role: 'Lead Developer — architecture of the decoupling, API layer, and storefront.',
    team: 'Worked with the client’s in-house catalogue and fulfilment staff for data and pricing rules.',
    duration: 'Ongoing since 2019',
    stack: [
      'Drupal (headless)',
      'JSON:API',
      'Decoupled API subdomain',
      'PHP',
      'MySQL',
      'Edge caching',
      'Custom storefront theme',
    ],
    images: [
      {
        src: '/images/case-studies/accu-glass-catalogue.webp',
        alt: 'A product category listing ultra-high-vacuum components',
        caption: 'Anonymous catalogue data is cached; account pricing is not.',
      },
      {
        src: '/images/case-studies/accu-glass-quick-order.webp',
        alt: 'The quick order form accepting part numbers and quantities',
        caption: 'Engineers order by part number, so quick order is the primary path.',
      },
    ],
    lastUpdated: '2026-08',
  },
};

/** A case study is publishable only when the fields that carry it are filled. */
export const isPublishable = (c: CaseStudy): boolean =>
  c.summary.trim().length > 0 &&
  c.problem.trim().length > 0 &&
  c.approach.trim().length > 0 &&
  c.outcome.trim().length > 0 &&
  c.role.trim().length > 0;

export const publishedCaseStudies: CaseStudy[] =
  Object.values(caseStudies).filter(isPublishable);

export const getCaseStudy = (slug: string): CaseStudy | undefined => {
  const c = caseStudies[slug];
  return c && isPublishable(c) ? c : undefined;
};

/** Drives generateStaticParams() for /projects/[slug]. */
export const caseStudySlugs: string[] = publishedCaseStudies.map((c) => c.slug);

/* ================================================================== */
/* Testimonials                                                       */
/*                                                                    */
/* Two groups, deliberately separated.                                */
/*                                                                    */
/* 1. The four real entries carried over from a5project.com. Their    */
/*    quotes are still empty and `consentObtained` is still null —    */
/*    each names a real person and three name an employer, so         */
/*    republishing them is processing personal data under RA 10173    */
/*    and, for any EU-based reviewer, GDPR. They stay unpublishable    */
/*    here for the same reason they are unpublishable in docs/: no    */
/*    quote has been pasted and nobody has been asked.                 */
/*                                                                    */
/* 2. Fictional entries with consent dates, so the section and its    */
/*    nav item can actually be built and seen. The authors are        */
/*    invented on purpose — putting invented words in a real client's  */
/*    mouth is precisely what the consent gate exists to prevent.      */
/*                                                                    */
/* Delete group 2 entirely when real consented quotes arrive.          */
/* ================================================================== */

export const testimonials: Testimonial[] = [
  /* --- Real, unpublishable: quote not pasted, consent not obtained --- */
  {
    id: 'abinayan-emanu',
    quote: '', // TODO: paste from a5project.com — Drupal/PHP 7 upgrade work
    author: 'Abinayan Emanu',
    company: 'InSupport',
    context: 'PHP 7 upgrade and Drupal development.',
    date: '2018', // TODO: confirm
    consentObtained: null,
    // Strongest of the four: named person, named company, specific work.
  },
  {
    id: 'john-carlos',
    quote: '', // TODO: paste from a5project.com — Drupal work
    author: 'John Carlos',
    company: 'Viacom',
    context: 'Drupal work.',
    date: '2018', // TODO: confirm
    consentObtained: null,
    // CAUTION: verify the Viacom association before publishing. If this was
    // marketplace or personal-capacity work rather than an engagement with
    // Viacom, naming the company implies a client relationship that did not
    // exist. Attribute to the person alone if in any doubt.
  },
  {
    id: 'ney-flores',
    quote: '', // TODO: paste from a5project.com
    author: 'Ney Flores',
    company: undefined, // TODO: add if known — an unattributed name is weak
    context: '', // TODO
    date: '2018', // TODO: confirm
    consentObtained: null,
  },
  {
    id: 'designers-mob',
    quote: '', // TODO: paste from a5project.com
    author: "The Designer's Mob",
    company: undefined,
    context: '', // TODO
    date: '2018', // TODO: confirm
    consentObtained: null,
    // Weakest attribution: a handle with no person behind it. Consider
    // dropping, or ask the client for a name and title to attach.
  },

  /* --- Fictional, publishable: development fixtures only ------------ */
  {
    id: 'mock-dana-reyes',
    quote:
      'He took a Drupal install nobody wanted to touch and made it something we could actually ship against. What I remember most is that he told us which of our requests were a bad idea before he built them.',
    author: 'Dana Reyes',
    role: 'Operations Manager',
    company: 'Northfield Vacuum Supply',
    context: 'FICTIONAL — development fixture, not a real client.',
    date: '2025-04',
    consentObtained: '2026-08-01',
  },
  {
    id: 'mock-marcus-hale',
    quote:
      'We asked for a quote form and got a calculator that answers the customer’s real question in about four seconds. Our enquiries went from vague to specific overnight.',
    author: 'Marcus Hale',
    role: 'Founder',
    company: 'Hale Renewables',
    context: 'FICTIONAL — development fixture, not a real client.',
    date: '2026-01',
    consentObtained: '2026-08-01',
  },
  {
    id: 'mock-priya-nandakumar',
    quote:
      'Clear estimates, no surprises, and a handover document our own team could follow six months later. That last part is rarer than it should be.',
    author: 'Priya Nandakumar',
    role: 'Head of Digital',
    company: 'Kestrel Instruments',
    context: 'FICTIONAL — development fixture, not a real client.',
    date: '2025-11',
    consentObtained: '2026-08-01',
  },
];

/**
 * The only export the Testimonials section should import.
 * An entry renders when consent is on file AND the quote has been pasted in.
 */
export const publishableTestimonials: Testimonial[] = testimonials.filter(
  (t) => t.consentObtained !== null && t.quote.trim().length > 0,
);

/** Hide the whole section — and its nav item — rather than render an empty heading. */
export const hasTestimonials = publishableTestimonials.length > 0;

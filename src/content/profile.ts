/**
 * src/content/profile.ts
 *
 * Identity, positioning copy, and the links that appear in more than one place.
 *
 * Anything stated here as fact must match docs/RomualdoDasigResume.pdf. Where the
 * two have drifted, §6.3 of context/project-overview.md is the reconciled record.
 * Years of experience is NOT written here as a literal — it is derived from the
 * employment history in src/content/experience.ts (see src/lib/career.ts), so the
 * number cannot go stale the way "more than 15 years" did.
 */

export interface SocialLink {
  label: string;
  href: string;
  /** Shown in the contact aside; the bare handle reads better than the full URL. */
  handle: string;
}

export const profile = {
  name: 'Romualdo Dasig',
  title: 'Software Engineer',
  location: 'Cebu, Philippines',
  availability: 'Remote · UTC+8',
  focus: 'Next.js · Drupal · eCommerce',
  /** Career start. Every duration on the page counts from here. */
  careerStart: '2008-11',
  email: 'me@dasigr.com',
  /** Obfuscated for the visible label only — the mailto: href uses the real address. */
  emailDisplay: 'me [at] dasigr [dot] com',
  /** Canonical origin (§9.3). Used in outbound email bodies; no trailing slash. */
  url: 'https://www.dasigr.com',
} as const;

export const socials: SocialLink[] = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/romualdo-dasig-55937723',
    handle: '/in/romualdo-dasig',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/dasigr',
    handle: 'github.com/dasigr',
  },
];

export const portraits = {
  /** Hero. Square source, rendered as a circle. */
  headshot: {
    src: '/romualdo-dasig-profile.jpg',
    width: 1024,
    height: 1024,
    alt: 'Romualdo Dasig, facing the camera in a pale blue collared shirt.',
  },
  /** About. 2:3 studio portrait. */
  full: {
    src: '/romualdo-dasig-portrait.jpg',
    width: 4672,
    height: 7008,
    alt: 'Romualdo Dasig standing with arms folded, in a pale blue short-sleeved shirt against a grey studio backdrop.',
  },
} as const;

/**
 * Hero positioning statement. Takes the derived experience phrase so the claim
 * and the career bus beneath it can never disagree.
 */
export const positioningStatement = (experiencePhrase: string): string =>
  `Building for the web since 2008 — ${experiencePhrase} across Drupal, WordPress and, for the last several, Next.js. Deep eCommerce work: B2B catalogues, decoupled Drupal, and sites that have to keep taking orders while you rebuild them.`;

/**
 * About narrative (FR-2). Three of the five points the spec requires are load-bearing
 * and must survive any rewrite: continuous since 2008, five years at Dentsu on a live
 * eCommerce site, and the Teradyne board-repair origin.
 */
export const aboutParagraphs: string[] = [
  'I have been building for the web continuously since November 2008 — twelve engagements, employed and independent, with no gaps between them. The depth is in Drupal and WordPress: custom themes, Drupal Commerce, B2B catalogues, and the unglamorous work of keeping a store selling while it is being rebuilt underneath.',
  'The last several years moved that toward Next.js and React. Two of the three projects I lead with are Next.js builds; the third is a headless Drupal storefront behind a decoupled API subdomain. Before that came five years at Dentsu Myco Services on a live eCommerce site, where the constraint was never the framework — it was that nothing could go down.',
  'I design in Figma or start from v0, and build with Claude in the loop, the same way I use Composer or Drush. It is tooling, not magic, and it is judged the same way: does the thing it produced survive review.',
  'I started as a board repair specialist at Teradyne, tracing faults on test-system boards. That is where the habit of finding the actual fault instead of the plausible one comes from, and it has been more useful in software than anything else I brought with me.',
];

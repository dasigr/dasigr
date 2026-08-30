/**
 * src/content/experience.ts
 *
 * Employment history, matching §6.3 of context/project-overview.md — which is the
 * reconciliation of docs/RomualdoDasigResume.pdf against the old site.
 *
 * ── TWO RULES ──────────────────────────────────────────────────────────────────
 * 1. ONE reverse-chronological sequence. The five freelance periods are bounded and
 *    sit inline. There is no parallel track — rendering one would reintroduce exactly
 *    the date confusion §6.4 exists to remove.
 * 2. NOTE: the resume PDF prints the Nov 2018 – Jun 2019 freelance entry ABOVE Zyrous
 *    (Jul 2019 – Dec 2020), which reads as a date error. The order below is correct;
 *    the PDF is the artifact that needs fixing. Do not "correct" this file to match it.
 *
 * Bullets are only present where a real one exists. Several entries deliberately carry
 * none — the spec (§6.10) flags the missing ones as duty statements needing outcomes,
 * and an empty entry is honest where invented prose would not be.
 */

export type EngagementKind = 'employed' | 'independent';

export interface Engagement {
  company: string;
  /** Rendered small, after the location. For former trading names and similar. */
  note?: string;
  role: string;
  location: string;
  /** "YYYY-MM". */
  start: string;
  /** "YYYY-MM", or null while ongoing. */
  end: string | null;
  kind: EngagementKind;
  bullets?: string[];
  stack?: string[];
}

/** The software career. Reverse-chronological by start date. 12 engagements. */
export const engagements: Engagement[] = [
  {
    company: 'Freelance / Upwork',
    role: 'Software Engineer',
    location: 'Danao City, Cebu',
    start: '2026-06',
    end: null,
    kind: 'independent',
    // The prototype claimed "ongoing maintenance for two long-running WordPress
    // clients" here. Every entry in maintenanceClients is now marked `previous`,
    // so that bullet would be a live overclaim — removed until there is a current
    // maintenance client to point at.
    bullets: [
      'Building and maintaining Next.js sites for local and overseas clients.',
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'Vercel'],
  },
  {
    company: 'Dentsu Myco Services Inc.',
    role: 'Drupal & PHP Developer',
    location: 'Makati City',
    start: '2021-12',
    end: '2026-05',
    kind: 'employed',
    bullets: [
      'Five years on a live eCommerce platform — feature work shipped without downtime.',
      'Drupal module and theme development, API integrations, and release support.',
    ],
    stack: ['Drupal 9–10', 'PHP', 'Twig', 'MySQL', 'Jenkins CI'],
  },
  {
    company: 'Freelance / Upwork',
    role: 'Software Engineer',
    location: 'Consolacion, Cebu',
    start: '2021-07',
    end: '2021-11',
    kind: 'independent',
    bullets: ['Client site builds and maintenance between engagements.'],
  },
  {
    company: 'Peregrine Consulting Group',
    role: 'Software Engineer',
    location: 'Chicago, Illinois (remote)',
    start: '2021-01',
    end: '2021-06',
    kind: 'employed',
    bullets: ['Drupal development for US client work.'],
    stack: ['Drupal', 'PHP'],
  },
  {
    company: 'Zyrous Pty Ltd.',
    role: 'Software Engineer',
    location: 'Perth, Western Australia (remote)',
    start: '2019-07',
    end: '2020-12',
    kind: 'employed',
    bullets: ['Web application development for Australian clients.'],
    stack: ['PHP', 'JavaScript'],
  },
  {
    company: 'Freelance / Upwork',
    role: 'Software Engineer',
    location: 'Consolacion, Cebu',
    start: '2018-11',
    end: '2019-06',
    kind: 'independent',
  },
  {
    company: 'True Apex',
    role: 'Web Designer and Developer',
    location: 'San Diego, California (remote)',
    start: '2015-03',
    end: '2018-10',
    kind: 'employed',
    bullets: [
      'Built and maintained client sites across audio, industrial, and eCommerce sectors.',
      'Drupal and WordPress theme development, plus Drupal Commerce storefronts.',
    ],
    stack: ['Drupal', 'WordPress', 'PHP', 'SASS'],
  },
  {
    company: 'Bridge Technology Partners',
    role: 'Software Engineer',
    location: 'Cebu Business Park, Cebu City',
    start: '2014-10',
    end: '2015-03',
    kind: 'employed',
    bullets: ['Web application development on client projects.'],
  },
  {
    company: 'Elementz Interactive Inc.',
    role: 'Software Engineer',
    location: 'IT Park, Cebu City',
    start: '2013-02',
    end: '2014-09',
    kind: 'employed',
    bullets: ['Drupal and PHP development for agency clients.'],
    stack: ['Drupal 7', 'PHP', 'jQuery'],
  },
  {
    company: 'Freelance / oDesk',
    role: 'Software Engineer',
    location: 'Consolacion, Cebu',
    start: '2012-01',
    end: '2013-01',
    kind: 'independent',
  },
  {
    company: 'Infocus Multimedia and Business Solutions',
    note: 'formerly Sports In Focus Pty. Ltd.',
    role: 'Web Developer',
    location: 'Mandaue City, Cebu',
    start: '2011-08',
    end: '2011-12',
    kind: 'employed',
    bullets: ['Front-end and CMS work on company web properties.'],
  },
  {
    company: 'Freelance / ScriptLance',
    role: 'Software Engineer',
    location: 'Consolacion, Cebu',
    start: '2008-11',
    end: '2011-07',
    kind: 'independent',
    bullets: [
      'First continuous web work — client sites built evenings and weekends alongside the Teradyne role, then full-time.',
      'The hardware-to-software transition, visible in the overlap.',
    ],
    stack: ['Drupal', 'WordPress', 'CodeIgniter', 'HTML5 / CSS3', 'jQuery'],
  },
];

/**
 * Electronics and test engineering, collapsed behind a <details> (FR-4).
 * The Teradyne board-repair role overlaps the first freelance period to Oct 2010.
 * That overlap is intentional and needs no annotation — it IS the transition.
 */
export interface EarlierRole {
  company: string;
  role: string;
  location: string;
  period: string;
}

export const earlierCareer: EarlierRole[] = [
  {
    company: 'Teradyne Philippines Ltd.',
    role: 'Board Repair Specialist, A5XX Systems',
    location: 'Lapu-Lapu City',
    period: 'Aug 2007 – Oct 2010',
  },
  {
    company: 'Teradyne Philippines Ltd.',
    role: 'Trainee, A5XX Systems',
    location: 'Lapu-Lapu City',
    period: 'Mar 2006 – Mar 2007',
  },
  {
    company: 'Cebu Mitsumi, Inc.',
    role: 'Trainee, KKO Division',
    location: 'Danao City',
    period: 'Dec 2005 – Mar 2006',
  },
];

export const earlierCareerSummary =
  'Earlier career: electronics and test engineering, 2005–2010';

/**
 * FR-4b. One line, stated plainly, low on the page. Omitting it reads as concealment;
 * dressing it up reads worse than the plain fact.
 */
export const education = {
  institution: 'CITE Technical Institute',
  program: 'Industrial Technician Program, Major in Industrial Electronics Technology',
  location: 'Cebu City',
  completed: 'June 2007',
} as const;

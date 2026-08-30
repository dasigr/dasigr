/**
 * src/content/experience.ts
 *
 * Employment history. **`private/romualdo-dasig-resume.odt` is the source of truth**
 * — it is the editable original the PDF is exported from. §6.3 of
 * context/project-overview.md is kept reconciled against it, not the other way round.
 * If the two ever disagree again, the ODT wins and the spec table gets corrected.
 *
 * ── THREE RULES ────────────────────────────────────────────────────────────────
 * 1. ONE reverse-chronological sequence. The five freelance periods are bounded and
 *    sit inline. There is no parallel track — rendering one would reintroduce exactly
 *    the date confusion §6.4 exists to remove.
 * 2. Every bullet is the ODT's own wording, with a terminal period added for the
 *    rendered list. Do not rewrite one into site voice: the resume and the page get
 *    read side by side, and a paraphrase is how they drift apart.
 * 3. `stack` is the one field with no ODT counterpart, so it is constrained: a tag
 *    may only name a technology the ODT names *in that entry* (its bullets or its
 *    role title). The resume's global SKILLS list does not license attributing a
 *    tool to a particular employer — that is how Twig, MySQL and Jenkins CI ended up
 *    on Dentsu, and Drupal on Peregrine, which did no Drupal work at all.
 *
 * One entry carries no `stack`: the ODT names no technology in Bridge Technology
 * Partners at all.
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
    // This entry used to carry the same three bullets as the 2021 and 2018 freelance
    // periods, which is why the Experience section read Drupal-first while the hero
    // and About led with Next.js. The ODT was rewritten at the source rather than
    // patched here, and now names Next.js itself — so the two agree without a bullet
    // being invented in this file. Angular and Bitbucket Pipelines are gone because
    // the rewritten entry no longer names either.
    bullets: [
      'Develop websites and web applications assisted with AI coding tools (i.e. Claude Code, v0).',
      'Develop custom modules and themes for Drupal 10/11 that adhere to Drupal Coding Standards.',
      'Develop Web Service APIs using JSON:API specification.',
      'Develop Web Applications with Next.js.',
      'Integrate with Third-Party APIs (i.e. Stripe, Resend).',
      'Set up CI/CD workflow with GitHub/Bitbucket, Docker, Vercel, AWS, and Google Cloud Platform.',
    ],
    stack: [
      'Next.js',
      'Drupal 10/11',
      'JSON:API',
      'Stripe',
      'Resend',
      'Docker',
      'Vercel',
      'AWS',
      'Google Cloud',
    ],
  },
  {
    company: 'Dentsu Myco Services Inc.',
    role: 'Drupal & PHP Developer',
    location: 'Makati City, Manila',
    start: '2021-12',
    end: '2026-05',
    kind: 'employed',
    bullets: [
      'Provide technical support to an eCommerce website.',
      'Enhance or implement new features on the website.',
      'Monitor site performance and do proactive maintenance.',
      'Manage accounts and customer orders.',
      'Fix both frontend UI and backend issues.',
    ],
    // Only what the role title itself names. Twig, MySQL and Jenkins CI came from the
    // resume's global skills list, not from anything the ODT says about Dentsu.
    stack: ['Drupal', 'PHP'],
  },
  {
    company: 'Freelance / Upwork',
    role: 'Software Engineer',
    location: 'Consolacion, Cebu',
    start: '2021-07',
    end: '2021-11',
    kind: 'independent',
    bullets: [
      'Develop custom modules and themes for Drupal 7/8/9 that adhere to Drupal Coding Standards.',
      'Develop Web Service APIs using JSON:API specification and web applications with Angular.',
      'Set up CI/CD workflow with Bitbucket, Bitbucket Pipelines, AWS, and Google Cloud Platform.',
    ],
    stack: [
      'Drupal 7/8/9',
      'JSON:API',
      'Angular',
      'Bitbucket Pipelines',
      'AWS',
      'Google Cloud',
    ],
  },
  {
    company: 'Peregrine Consulting Group',
    role: 'Software Engineer',
    location: 'Chicago, Illinois',
    start: '2021-01',
    end: '2021-06',
    kind: 'employed',
    // This was the IoT engagement, not a Drupal one. The old bullet and stack said
    // otherwise and were wrong on both counts.
    bullets: [
      'Build prototypes of IoT devices.',
      'Build an MQTT gateway for testing IoT devices.',
      'Set up IoT devices to connect to Google Cloud IoT Core.',
      'Develop a web application using Angular.',
      'Develop a web service API using Laravel.',
    ],
    stack: ['Angular', 'Laravel', 'MQTT', 'Google Cloud IoT Core'],
  },
  {
    company: 'Zyrous Pty Ltd.',
    role: 'Software Engineer',
    location: 'Perth, Western Australia',
    start: '2019-07',
    end: '2020-12',
    kind: 'employed',
    bullets: [
      'Build multiple websites based on Drupal.',
      'Build mobile-responsive websites through Zeplin.',
      'Develop custom modules and themes.',
    ],
    stack: ['Drupal', 'Zeplin'],
  },
  {
    company: 'Freelance / Upwork',
    role: 'Software Engineer',
    location: 'Consolacion, Cebu',
    start: '2018-11',
    end: '2019-06',
    kind: 'independent',
    bullets: [
      'Develop custom modules and themes for Drupal 7/8 that adhere to Drupal Coding Standards.',
      'Develop Web Service APIs and integrate third-party APIs.',
      'Build mobile-responsive websites for client projects.',
    ],
    stack: ['Drupal 7/8'],
  },
  {
    company: 'True Apex',
    role: 'Software Engineer',
    location: 'San Diego, California',
    start: '2015-03',
    end: '2018-10',
    kind: 'employed',
    bullets: [
      'Build enterprise-level eCommerce websites using Drupal Commerce.',
      'Build fully-responsive websites from PSD.',
      'Develop custom Drupal themes and modules.',
    ],
    stack: ['Drupal', 'Drupal Commerce'],
  },
  {
    company: 'Bridge Technology Partners',
    role: 'Software Engineer',
    location: 'Cebu Business Park, Cebu City',
    start: '2014-10',
    end: '2015-03',
    kind: 'employed',
    bullets: [
      'Developed Web Service APIs.',
      'Embrace Test-Driven Development methodology to assure code quality and faster deployment.',
    ],
  },
  {
    company: 'Elementz Interactive Inc.',
    role: 'Software Engineer',
    location: 'IT Park, Cebu City',
    start: '2013-02',
    end: '2014-09',
    kind: 'employed',
    bullets: [
      'Develop an Enterprise Resource Planning (ERP) system for clients.',
      'Develop Web Service APIs using CodeIgniter and Laravel.',
      'Develop single-page web applications.',
    ],
    stack: ['CodeIgniter', 'Laravel'],
  },
  {
    company: 'Freelance / oDesk',
    role: 'Software Engineer',
    location: 'Consolacion, Cebu',
    start: '2012-01',
    end: '2013-01',
    kind: 'independent',
    bullets: [
      'Develop websites in Drupal and WordPress for small-business clients.',
      'Develop Web Service APIs or integrate third-party APIs.',
      "Fix design issues and install added features on clients' websites.",
    ],
    stack: ['Drupal', 'WordPress'],
  },
  {
    company: 'Infocus Multimedia and Business Solutions',
    note: 'formerly Sports In Focus Pty. Ltd.',
    role: 'Web Developer',
    location: 'Mandaue City, Cebu',
    start: '2011-08',
    end: '2011-12',
    kind: 'employed',
    bullets: [
      'Lead in the development of eCommerce websites.',
      'Customize Drupal modules to function as per business requirements.',
    ],
    stack: ['Drupal'],
  },
  {
    company: 'Freelance / ScriptLance',
    role: 'Web Developer',
    location: 'Consolacion, Cebu',
    start: '2008-11',
    end: '2011-07',
    kind: 'independent',
    // The hardware-to-software transition used to be spelled out here in site voice.
    // It is still visible without the prose: this entry starts Nov 2008, while the
    // Teradyne board-repair role in earlierCareer runs to Oct 2010.
    bullets: [
      'Develop Web Service APIs or integrate third-party APIs.',
      'Develop websites in Drupal, WordPress, and CodeIgniter.',
      'Build mobile-responsive front-ends with HTML5, CSS3, and jQuery.',
      'Develop websites ranging from personal blogging to eCommerce.',
      "Fix design issues and install added features on clients' websites.",
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
    role: 'Board Repair Specialist, A5XX Systems Department',
    location: 'Lapu-Lapu City, Cebu',
    period: 'Aug 2007 – Oct 2010',
  },
  {
    company: 'Teradyne Philippines Ltd.',
    role: 'Trainee, A5XX Systems Department',
    location: 'Lapu-Lapu City, Cebu',
    period: 'Mar 2006 – Mar 2007',
  },
  {
    company: 'Cebu Mitsumi, Inc.',
    role: 'Trainee, KKO Division',
    location: 'Danao City, Cebu',
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
  location: 'San Jose, Cebu City',
  completed: 'June 2007',
} as const;

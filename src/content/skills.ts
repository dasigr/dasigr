/**
 * src/content/skills.ts
 *
 * Grouped by where a thing sits in a build (§6.5). Purely presentational — FR-3 is
 * explicit that there are no proficiency bars, because a percentage next to a
 * language name means nothing to the person reading it.
 *
 * `primary` marks the handful the positioning statement leads with. It changes the
 * tag's styling only; it is not a skill level.
 */

export interface Skill {
  name: string;
  primary?: boolean;
}

export interface SkillGroup {
  /** Decorative. Paired with the group name, so it stays aria-hidden. */
  icon: string;
  name: string;
  /** Full-width row at the bottom of the grid. */
  wide?: boolean;
  skills: Skill[];
}

export const skillGroups: SkillGroup[] = [
  {
    icon: '⚙️',
    name: 'Platforms',
    skills: [
      { name: 'Next.js', primary: true },
      { name: 'Drupal 7–11', primary: true },
      { name: 'Drupal Commerce' },
      { name: 'WordPress' },
      { name: 'WooCommerce' },
      { name: 'Laravel' },
    ],
  },
  {
    icon: '🔧',
    name: 'Back-end',
    skills: [
      { name: 'RESTful API design' },
      { name: 'JSON:API' },
      { name: 'Third-party API integration' },
      { name: 'PHP' },
      { name: 'Python' },
      { name: 'C / C++' },
      { name: 'MySQL' },
      { name: 'MariaDB' },
      { name: 'Postgres' },
      { name: 'MVC' },
      { name: 'OOP & design patterns' },
    ],
  },
  {
    icon: '🎨',
    name: 'Front-end',
    skills: [
      { name: 'React', primary: true },
      { name: 'JavaScript' },
      { name: 'TypeScript' },
      { name: 'HTML5' },
      { name: 'CSS3' },
      { name: 'SASS' },
      { name: 'Tailwind' },
      { name: 'jQuery' },
      { name: 'Bootstrap' },
      { name: 'Twig' },
      { name: 'BEM / SMACSS' },
      { name: 'Figma' },
      { name: 'v0' },
    ],
  },
  {
    icon: '🧪',
    name: 'Quality & tooling',
    skills: [
      { name: 'PHPUnit' },
      { name: 'Selenium' },
      { name: 'Playwright' },
      { name: 'Jenkins CI' },
      { name: 'Git / Git Flow' },
      { name: 'Composer' },
      { name: 'DDEV' },
      { name: 'Drush' },
      { name: 'PSR-0 / PSR-4' },
      { name: 'Drupal coding standards' },
      { name: 'BrowserStack' },
      { name: 'JIRA' },
    ],
  },
  {
    icon: '☁️',
    name: 'Infrastructure',
    wide: true,
    skills: [
      { name: 'Docker' },
      { name: 'Kubernetes' },
      { name: 'AWS' },
      { name: 'Google Cloud' },
      { name: 'Pantheon' },
      { name: 'Vercel' },
      { name: 'Shell scripting' },
      { name: 'SSH' },
    ],
  },
];

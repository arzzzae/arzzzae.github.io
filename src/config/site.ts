/**
 * Single source of truth for the site's identity, links and feature flags.
 *
 * Everything here is plain data so it can be imported by both Astro pages and
 * React islands, and so the section-resolution logic stays pure and testable.
 */

export type SectionId =
  | 'hero'
  | 'about'
  | 'skills'
  | 'experience'
  | 'industries'
  | 'projects'
  | 'testimonials'
  | 'contact';

export interface SocialLink {
  label: string;
  url: string;
  /** lucide-style icon key, resolved by the UI layer. */
  icon: string;
}

export interface SiteConfig {
  name: string;
  /** Professional headline shown in the hero / meta tags. */
  role: string;
  /** Short tagline used under the hero title. */
  tagline: string;
  /** Longer professional summary used in the About section + meta description. */
  summary: string;
  email: string;
  /** GitHub username used to auto-populate the projects section. */
  githubUsername: string;
  /** Path (relative to site root) to the downloadable resume. */
  resumeUrl: string;
  /**
   * Social links. `linkedin` and `github` are required; everything else is
   * optional so new networks can be added later by simply filling in a URL.
   */
  social: {
    linkedin: string;
    github: string;
    twitter?: string;
    bluesky?: string;
    mastodon?: string;
    youtube?: string;
    dribbble?: string;
    website?: string;
  };
  /**
   * Feature flags. A section can be force-disabled here. Sections that are
   * data-driven (projects, testimonials) additionally hide themselves when
   * they have no content — see `resolveSections`.
   */
  features: Record<SectionId, boolean>;
}

export const siteConfig: SiteConfig = {
  name: 'Rosel John Candoy',
  role: 'Application Developer',
  tagline: 'Building thoughtful software for ~10 years — .NET, modern web, and AI/LLM.',
  summary:
    "I'm an application developer with nearly a decade of experience designing and " +
    'building web and desktop software. My curiosity for how things work goes back to my ' +
    'pre-teens, scripting in-game events in the Warcraft III World Editor. I move fast and ' +
    'adapt quickly — which has let me work across .NET (MVC, Web API, Blazor, WinUI3, MAUI), ' +
    'modern JavaScript (React, Angular, Vue), relational and document databases, and Microsoft ' +
    'Azure. Lately I build with Python and Flask, weaving AI/LLM tooling ' +
    'into my workflow to ship faster.',
  email: 'r.johncandoy@outlook.com',
  githubUsername: 'arzzzae',
  resumeUrl: '/resume.pdf',
  social: {
    linkedin: 'https://www.linkedin.com/in/rjcandoy/',
    github: 'https://github.com/arzzzae',
    // Add more here in the future (e.g. twitter, bluesky) and they will appear automatically.
  },
  features: {
    hero: true,
    about: true,
    skills: true,
    experience: true,
    industries: true,
    projects: true,
    testimonials: true,
    contact: true,
  },
};

/** The canonical render order of sections. */
export const SECTION_ORDER: SectionId[] = [
  'hero',
  'about',
  'skills',
  'experience',
  'industries',
  'projects',
  'testimonials',
  'contact',
];

export interface SectionContentCounts {
  industries: number;
  projects: number;
  testimonials: number;
}

/**
 * Resolve which sections should actually render, given the config feature
 * flags and how much data each data-driven section has.
 *
 * Pure function — easy to unit test.
 */
export function resolveSections(
  config: SiteConfig,
  counts: SectionContentCounts,
): SectionId[] {
  return SECTION_ORDER.filter((id) => {
    if (!config.features[id]) return false;
    // Data-driven sections hide themselves when empty.
    if (id === 'industries') return counts.industries > 0;
    if (id === 'testimonials') return counts.testimonials > 0;
    if (id === 'projects') return counts.projects > 0;
    return true;
  });
}

/**
 * Resolve the social links that have a URL set, in a stable display order.
 * Optional networks simply don't appear until a URL is added to the config.
 */
export function resolveSocialLinks(config: SiteConfig): SocialLink[] {
  const order: Array<{ key: keyof SiteConfig['social']; label: string; icon: string }> = [
    { key: 'github', label: 'GitHub', icon: 'github' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
    { key: 'twitter', label: 'X', icon: 'twitter' },
    { key: 'bluesky', label: 'Bluesky', icon: 'bluesky' },
    { key: 'mastodon', label: 'Mastodon', icon: 'mastodon' },
    { key: 'youtube', label: 'YouTube', icon: 'youtube' },
    { key: 'dribbble', label: 'Dribbble', icon: 'dribbble' },
    { key: 'website', label: 'Website', icon: 'globe' },
  ];

  return order
    .map(({ key, label, icon }) => {
      const url = config.social[key];
      return url ? { label, url, icon } : null;
    })
    .filter((link): link is SocialLink => link !== null);
}

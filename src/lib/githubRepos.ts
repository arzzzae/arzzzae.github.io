/**
 * Pure transforms for turning the GitHub REST API repo payload into the
 * normalized project list rendered on the site, merged with manually pinned
 * projects.
 *
 * Kept free of any network/DOM dependency so it can be unit-tested in
 * isolation. The actual fetch lives in `fetchRepos.ts`.
 */

/** Subset of the GitHub REST API repo shape that we rely on. */
export interface GitHubApiRepo {
  id: number;
  name: string;
  full_name?: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count?: number;
  topics?: string[];
  homepage?: string | null;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
  updated_at?: string;
}

/** Normalized project used throughout the UI. */
export interface Project {
  /** Stable slug used as a React key. */
  slug: string;
  name: string;
  description: string;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  /** ISO timestamp of the last push. */
  updatedAt: string;
  /** True when this entry is manually pinned/featured. */
  featured: boolean;
}

/** A manually featured project defined in the `projects` content collection. */
export interface PinnedProject {
  /** Must match the GitHub repo `name` to override its metadata. */
  repo?: string;
  name: string;
  description: string;
  url: string;
  homepage?: string | null;
  language?: string | null;
  topics?: string[];
  /** Lower number = earlier. Defaults to insertion order. */
  order?: number;
}

export interface NormalizeOptions {
  /** Exclude forks. Default true. */
  excludeForks?: boolean;
  /** Exclude archived repos. Default true. */
  excludeArchived?: boolean;
  /** Repo names to always exclude (e.g. the site repo itself, profile readme). */
  exclude?: string[];
}

const DEFAULT_OPTIONS: Required<NormalizeOptions> = {
  excludeForks: true,
  excludeArchived: true,
  exclude: [],
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalize a raw API repo into a `Project`. */
export function normalizeRepo(repo: GitHubApiRepo): Project {
  return {
    slug: toSlug(repo.name),
    name: repo.name,
    description: repo.description?.trim() || 'No description provided.',
    url: repo.html_url,
    homepage: repo.homepage?.trim() ? repo.homepage.trim() : null,
    language: repo.language,
    stars: repo.stargazers_count ?? 0,
    topics: repo.topics ?? [],
    updatedAt: repo.pushed_at,
    featured: false,
  };
}

/**
 * Build the final, ordered project list from raw API repos and pinned entries.
 *
 * Rules:
 * - forks / archived / explicitly-excluded repos are dropped (configurable);
 * - a pinned entry whose `repo` matches an API repo overrides that repo's
 *   metadata and marks it featured (it is not duplicated);
 * - pinned entries without a matching repo are included as standalone projects;
 * - featured projects sort first (by their `order`, then name), followed by the
 *   rest sorted by stars desc, then most-recently-pushed.
 */
export function buildProjectList(
  apiRepos: GitHubApiRepo[],
  pinned: PinnedProject[] = [],
  options: NormalizeOptions = {},
): Project[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const excludeSet = new Set(opts.exclude.map((n) => n.toLowerCase()));

  const filtered = apiRepos.filter((repo) => {
    if (opts.excludeForks && repo.fork) return false;
    if (opts.excludeArchived && repo.archived) return false;
    if (excludeSet.has(repo.name.toLowerCase())) return false;
    return true;
  });

  const normalizedByName = new Map<string, Project>();
  for (const repo of filtered) {
    normalizedByName.set(repo.name.toLowerCase(), normalizeRepo(repo));
  }

  const standalonePinned: Project[] = [];

  pinned.forEach((pin, index) => {
    const order = pin.order ?? index;
    const matchKey = pin.repo?.toLowerCase();
    const matched = matchKey ? normalizedByName.get(matchKey) : undefined;

    if (matched) {
      // Override the matched repo's metadata and flag as featured.
      normalizedByName.set(matchKey!, {
        ...matched,
        name: pin.name || matched.name,
        description: pin.description || matched.description,
        url: pin.url || matched.url,
        homepage: pin.homepage ?? matched.homepage,
        language: pin.language ?? matched.language,
        topics: pin.topics ?? matched.topics,
        featured: true,
        order,
      } as Project & { order: number });
    } else {
      standalonePinned.push({
        slug: toSlug(pin.name),
        name: pin.name,
        description: pin.description,
        url: pin.url,
        homepage: pin.homepage ?? null,
        language: pin.language ?? null,
        stars: 0,
        topics: pin.topics ?? [],
        updatedAt: new Date(0).toISOString(),
        featured: true,
        ...(({ order } as { order: number })),
      } as Project & { order: number });
    }
  });

  const all = [...standalonePinned, ...normalizedByName.values()] as Array<
    Project & { order?: number }
  >;

  all.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.featured && b.featured) {
      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    }
    if (b.stars !== a.stars) return b.stars - a.stars;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Strip the internal `order` helper before returning.
  return all.map(({ order, ...project }) => project);
}

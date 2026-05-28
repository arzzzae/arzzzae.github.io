/**
 * Build-time fetch adapter for GitHub public repositories.
 *
 * This is intentionally a thin wrapper around `fetch` + the pure transforms in
 * `githubRepos.ts`. A failed or rate-limited request must never break the build
 * — we degrade gracefully to whatever pinned/manual projects exist.
 */
import {
  buildProjectList,
  type GitHubApiRepo,
  type NormalizeOptions,
  type PinnedProject,
  type Project,
} from './githubRepos';

const GITHUB_API = 'https://api.github.com';

export interface FetchReposOptions extends NormalizeOptions {
  pinned?: PinnedProject[];
  /** Max repos to request (GitHub max page size is 100). */
  perPage?: number;
}

/**
 * Fetch a user's public repositories and return the normalized, ordered list.
 * On any network/parse error, returns the project list built from `pinned`
 * alone so the site still renders.
 */
export async function fetchUserProjects(
  username: string,
  options: FetchReposOptions = {},
): Promise<Project[]> {
  const { pinned = [], perPage = 100, ...normalizeOptions } = options;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'arzzzae-portfolio-build',
    };
    // An optional token (e.g. in CI) raises the rate limit but is not required.
    const token = import.meta.env?.GITHUB_TOKEN ?? process.env?.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&sort=pushed`,
      { headers },
    );

    if (!res.ok) {
      console.warn(
        `[fetchUserProjects] GitHub API returned ${res.status}; falling back to pinned projects only.`,
      );
      return buildProjectList([], pinned, normalizeOptions);
    }

    const repos = (await res.json()) as GitHubApiRepo[];
    if (!Array.isArray(repos)) {
      console.warn('[fetchUserProjects] Unexpected GitHub API payload; using pinned projects only.');
      return buildProjectList([], pinned, normalizeOptions);
    }

    return buildProjectList(repos, pinned, normalizeOptions);
  } catch (error) {
    console.warn('[fetchUserProjects] Fetch failed; using pinned projects only.', error);
    return buildProjectList([], pinned, normalizeOptions);
  }
}

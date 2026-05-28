import { describe, it, expect } from 'vitest';
import {
  buildProjectList,
  normalizeRepo,
  type GitHubApiRepo,
  type PinnedProject,
} from './githubRepos';

function makeRepo(overrides: Partial<GitHubApiRepo> = {}): GitHubApiRepo {
  return {
    id: Math.floor(Math.random() * 100000),
    name: 'sample-repo',
    html_url: 'https://github.com/arzzzae/sample-repo',
    description: 'A sample repo',
    language: 'TypeScript',
    stargazers_count: 0,
    forks_count: 0,
    topics: [],
    homepage: null,
    fork: false,
    archived: false,
    pushed_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('normalizeRepo', () => {
  it('maps API fields to the Project shape', () => {
    const project = normalizeRepo(
      makeRepo({ name: 'My Cool App', description: '  trimmed  ', stargazers_count: 12 }),
    );
    expect(project.slug).toBe('my-cool-app');
    expect(project.name).toBe('My Cool App');
    expect(project.description).toBe('trimmed');
    expect(project.stars).toBe(12);
    expect(project.featured).toBe(false);
  });

  it('falls back to a placeholder description when none is provided', () => {
    expect(normalizeRepo(makeRepo({ description: null })).description).toBe(
      'No description provided.',
    );
  });

  it('treats blank homepage as null', () => {
    expect(normalizeRepo(makeRepo({ homepage: '   ' })).homepage).toBeNull();
    expect(normalizeRepo(makeRepo({ homepage: 'https://x.dev' })).homepage).toBe('https://x.dev');
  });
});

describe('buildProjectList filtering', () => {
  it('excludes forks and archived repos by default', () => {
    const repos = [
      makeRepo({ name: 'real' }),
      makeRepo({ name: 'forked', fork: true }),
      makeRepo({ name: 'old', archived: true }),
    ];
    const result = buildProjectList(repos);
    expect(result.map((p) => p.name)).toEqual(['real']);
  });

  it('can be configured to include forks and archived', () => {
    const repos = [
      makeRepo({ name: 'real' }),
      makeRepo({ name: 'forked', fork: true }),
      makeRepo({ name: 'old', archived: true }),
    ];
    const result = buildProjectList(repos, [], {
      excludeForks: false,
      excludeArchived: false,
    });
    expect(result).toHaveLength(3);
  });

  it('excludes repos listed in the exclude option (case-insensitive)', () => {
    const repos = [makeRepo({ name: 'arzzzae.github.io' }), makeRepo({ name: 'keep' })];
    const result = buildProjectList(repos, [], { exclude: ['ARZZZAE.GITHUB.IO'] });
    expect(result.map((p) => p.name)).toEqual(['keep']);
  });
});

describe('buildProjectList sorting', () => {
  it('sorts non-featured by stars desc, then most recent push', () => {
    const repos = [
      makeRepo({ name: 'low', stargazers_count: 1, pushed_at: '2026-01-01T00:00:00Z' }),
      makeRepo({ name: 'high', stargazers_count: 50, pushed_at: '2025-01-01T00:00:00Z' }),
      makeRepo({ name: 'mid-new', stargazers_count: 10, pushed_at: '2026-05-01T00:00:00Z' }),
      makeRepo({ name: 'mid-old', stargazers_count: 10, pushed_at: '2024-05-01T00:00:00Z' }),
    ];
    const result = buildProjectList(repos);
    expect(result.map((p) => p.name)).toEqual(['high', 'mid-new', 'mid-old', 'low']);
  });
});

describe('buildProjectList pinned merging', () => {
  it('overrides matched repo metadata and marks it featured', () => {
    const repos = [makeRepo({ name: 'portfolio', description: 'auto', stargazers_count: 3 })];
    const pinned: PinnedProject[] = [
      {
        repo: 'portfolio',
        name: 'My Portfolio',
        description: 'curated description',
        url: 'https://arzzzae.com',
        order: 0,
      },
    ];
    const result = buildProjectList(repos, pinned);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Portfolio');
    expect(result[0].description).toBe('curated description');
    expect(result[0].featured).toBe(true);
    // stars preserved from the underlying repo
    expect(result[0].stars).toBe(3);
  });

  it('does not duplicate a repo that is also pinned', () => {
    const repos = [makeRepo({ name: 'dup' })];
    const pinned: PinnedProject[] = [
      { repo: 'dup', name: 'dup', description: 'd', url: 'https://x.dev' },
    ];
    expect(buildProjectList(repos, pinned)).toHaveLength(1);
  });

  it('includes standalone pinned projects with no matching repo', () => {
    const repos = [makeRepo({ name: 'auto', stargazers_count: 99 })];
    const pinned: PinnedProject[] = [
      { name: 'Private Work', description: 'closed source', url: 'https://x.dev' },
    ];
    const result = buildProjectList(repos, pinned);
    expect(result.map((p) => p.name)).toEqual(['Private Work', 'auto']);
    expect(result[0].featured).toBe(true);
  });

  it('orders featured projects before non-featured and respects order field', () => {
    const repos = [makeRepo({ name: 'auto', stargazers_count: 99 })];
    const pinned: PinnedProject[] = [
      { name: 'Second', description: 'b', url: 'https://b.dev', order: 2 },
      { name: 'First', description: 'a', url: 'https://a.dev', order: 1 },
    ];
    const result = buildProjectList(repos, pinned);
    expect(result.map((p) => p.name)).toEqual(['First', 'Second', 'auto']);
  });
});

describe('buildProjectList edge cases', () => {
  it('returns an empty list for no repos and no pins', () => {
    expect(buildProjectList([])).toEqual([]);
  });

  it('builds from pinned only when there are no repos', () => {
    const pinned: PinnedProject[] = [
      { name: 'Only Pin', description: 'd', url: 'https://x.dev' },
    ];
    const result = buildProjectList([], pinned);
    expect(result.map((p) => p.name)).toEqual(['Only Pin']);
  });

  it('does not leak the internal order helper field', () => {
    const pinned: PinnedProject[] = [
      { name: 'Pin', description: 'd', url: 'https://x.dev', order: 5 },
    ];
    const result = buildProjectList([], pinned);
    expect(result[0]).not.toHaveProperty('order');
  });
});

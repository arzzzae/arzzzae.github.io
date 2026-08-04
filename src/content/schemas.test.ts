import { describe, it, expect } from 'vitest';
import {
  experienceSchema,
  industryGroupSchema,
  pinnedProjectSchema,
  skillGroupSchema,
  testimonialSchema,
} from './schemas';

describe('experienceSchema', () => {
  it('applies defaults for end, highlights and stack', () => {
    const parsed = experienceSchema.parse({
      role: 'Dev',
      company: 'Acme',
      start: '2020',
      order: 0,
    });
    expect(parsed.end).toBe('Present');
    expect(parsed.highlights).toEqual([]);
    expect(parsed.stack).toEqual([]);
  });

  it('rejects an entry missing required fields', () => {
    expect(() => experienceSchema.parse({ role: 'Dev' })).toThrow();
  });
});

describe('industryGroupSchema', () => {
  it('accepts a company with one or more industries', () => {
    const parsed = industryGroupSchema.parse({
      id: 'aviation',
      company: 'Acme',
      industries: ['Aviation'],
      order: 0,
    });
    expect(parsed.industries).toEqual(['Aviation']);
  });

  it('rejects a company with no industries', () => {
    expect(() =>
      industryGroupSchema.parse({
        id: 'empty',
        company: 'Acme',
        industries: [],
        order: 0,
      }),
    ).toThrow();
  });
});

describe('skillGroupSchema', () => {
  it('accepts a valid group and defaults weight to 5', () => {
    const parsed = skillGroupSchema.parse({
      id: 'web',
      group: 'Web',
      items: ['React'],
    });
    expect(parsed.weight).toBe(5);
  });

  it('rejects an empty items array', () => {
    expect(() =>
      skillGroupSchema.parse({ id: 'x', group: 'X', items: [] }),
    ).toThrow();
  });

  it('rejects a weight outside 1..10', () => {
    expect(() =>
      skillGroupSchema.parse({ id: 'x', group: 'X', items: ['a'], weight: 99 }),
    ).toThrow();
  });
});

describe('pinnedProjectSchema', () => {
  it('accepts a minimal valid pinned project', () => {
    const parsed = pinnedProjectSchema.parse({
      id: 'p1',
      name: 'Thing',
      description: 'desc',
      url: 'https://example.com',
    });
    expect(parsed.repo).toBeUndefined();
  });

  it('rejects an invalid url', () => {
    expect(() =>
      pinnedProjectSchema.parse({
        id: 'p1',
        name: 'Thing',
        description: 'desc',
        url: 'not-a-url',
      }),
    ).toThrow();
  });
});

describe('testimonialSchema', () => {
  it('requires an author and defaults order to 0', () => {
    const parsed = testimonialSchema.parse({ author: 'Jane' });
    expect(parsed.order).toBe(0);
  });

  it('rejects an entry with no author', () => {
    expect(() => testimonialSchema.parse({ title: 'CTO' })).toThrow();
  });
});

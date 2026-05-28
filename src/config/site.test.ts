import { describe, it, expect } from 'vitest';
import {
  resolveSections,
  resolveSocialLinks,
  siteConfig,
  SECTION_ORDER,
  type SiteConfig,
} from './site';

function cloneConfig(overrides: Partial<SiteConfig> = {}): SiteConfig {
  return {
    ...siteConfig,
    ...overrides,
    features: { ...siteConfig.features, ...(overrides.features ?? {}) },
    social: { ...siteConfig.social, ...(overrides.social ?? {}) },
  };
}

describe('resolveSections', () => {
  it('renders all enabled sections when data-driven sections have content', () => {
    const result = resolveSections(cloneConfig(), { projects: 5, testimonials: 2 });
    expect(result).toEqual(SECTION_ORDER);
  });

  it('hides testimonials when there are none', () => {
    const result = resolveSections(cloneConfig(), { projects: 5, testimonials: 0 });
    expect(result).not.toContain('testimonials');
    expect(result).toContain('projects');
  });

  it('hides projects when there are none', () => {
    const result = resolveSections(cloneConfig(), { projects: 0, testimonials: 1 });
    expect(result).not.toContain('projects');
  });

  it('respects a disabled feature flag even when content exists', () => {
    const config = cloneConfig({
      features: { ...siteConfig.features, experience: false },
    });
    const result = resolveSections(config, { projects: 3, testimonials: 3 });
    expect(result).not.toContain('experience');
  });

  it('preserves the canonical section order', () => {
    const result = resolveSections(cloneConfig(), { projects: 1, testimonials: 1 });
    const indices = result.map((id) => SECTION_ORDER.indexOf(id));
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });
});

describe('resolveSocialLinks', () => {
  it('includes only links that have a URL set', () => {
    const links = resolveSocialLinks(cloneConfig());
    const labels = links.map((l) => l.label);
    expect(labels).toContain('GitHub');
    expect(labels).toContain('LinkedIn');
    expect(labels).not.toContain('X');
  });

  it('reveals optional networks once a URL is added', () => {
    const config = cloneConfig({
      social: { ...siteConfig.social, twitter: 'https://x.com/arzzzae' },
    });
    const links = resolveSocialLinks(config);
    expect(links.map((l) => l.label)).toContain('X');
  });

  it('orders GitHub and LinkedIn first', () => {
    const links = resolveSocialLinks(cloneConfig());
    expect(links[0].label).toBe('GitHub');
    expect(links[1].label).toBe('LinkedIn');
  });
});

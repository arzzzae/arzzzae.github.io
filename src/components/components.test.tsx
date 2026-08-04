import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Animations are visual and unsupported in happy-dom (GSAP reads SVG transform
// matrices that the DOM stub lacks). Per our testing strategy we smoke-test
// rendering only, so the GSAP stack is mocked inert here.
vi.mock('gsap', () => {
  const noop = () => undefined;
  const gsap = {
    registerPlugin: noop,
    set: noop,
    to: noop,
    from: noop,
    fromTo: noop,
    timeline: () => {
      const tl = { to: () => tl, from: () => tl, fromTo: () => tl };
      return tl;
    },
    ticker: { add: noop, remove: noop, lagSmoothing: noop },
  };
  return { gsap, default: gsap };
});
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { update: () => undefined } }));
vi.mock('@gsap/react', () => ({
  useGSAP: () => ({ contextSafe: <T,>(fn: T): T => fn }),
}));

import ThemeToggle from './ThemeToggle';
import MagneticButton from './MagneticButton';
import ProjectCard from './ProjectCard';
import Timeline from './Timeline';
import SkillsGalaxy from './SkillsGalaxy';
import type { Project } from '../lib/githubRepos';

// happy-dom has no matchMedia; provide a stub.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => cleanup());

const sampleProject: Project = {
  slug: 'demo',
  name: 'Demo Project',
  description: 'A demo project description.',
  url: 'https://github.com/arzzzae/demo',
  homepage: null,
  language: 'TypeScript',
  stars: 7,
  topics: ['astro', 'three'],
  updatedAt: '2026-01-01T00:00:00Z',
  featured: true,
};

describe('component smoke tests', () => {
  it('ThemeToggle renders a button without throwing', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('MagneticButton renders a link when given href', () => {
    render(
      <MagneticButton href="mailto:test@example.com" ariaLabel="Email">
        Contact
      </MagneticButton>,
    );
    const link = screen.getByRole('link', { name: 'Email' });
    expect(link).toHaveAttribute('href', 'mailto:test@example.com');
  });

  it('MagneticButton renders a button when no href', () => {
    render(<MagneticButton ariaLabel="Go">Go</MagneticButton>);
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('ProjectCard renders project details and a featured badge', () => {
    render(<ProjectCard project={sampleProject} />);
    expect(screen.getByText('Demo Project')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('★ 7')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', sampleProject.url);
  });

  it('Timeline renders all entries', () => {
    render(
      <Timeline
        entries={[
          {
            role: 'Dev',
            company: 'Acme',
            start: '2020',
            end: 'Present',
            highlights: ['Did things'],
            stack: ['C#'],
            industries: ['Aviation'],
            body: 'Body text',
          },
        ]}
      />,
    );
    expect(screen.getByText('Dev')).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
    expect(screen.getByText('Did things')).toBeInTheDocument();
    expect(screen.getByText('Aviation')).toBeInTheDocument();
  });

  it('SkillsGalaxy renders an accessible grouped skills list', () => {
    render(
      <SkillsGalaxy
        groups={[{ id: 'web', group: 'Web', weight: 8, items: ['React', 'Vue'] }]}
      />,
    );
    // Without WebGL (happy-dom) the component renders its accessible fallback.
    expect(screen.getByText(/React/)).toBeInTheDocument();
    expect(screen.getByText(/Vue/)).toBeInTheDocument();
    // Filter chip is a real toggle button.
    expect(screen.getByRole('button', { name: 'Web' })).toHaveAttribute('aria-pressed', 'true');
  });
});

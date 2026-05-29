import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import CanvasLoader from './CanvasLoader';

export interface SkillGroup {
  id: string;
  group: string;
  weight: number;
  items: string[];
}

export interface GalaxyColors {
  text: string;
  dim: string;
  bg: string;
}

interface SkillsGalaxyProps {
  groups: SkillGroup[];
}

/**
 * Per-category hue palette (degrees). Shared between the HTML filter chips and
 * the 3D nodes so each category has one consistent, unique color.
 */
export const SKILL_HUES = [212, 268, 150, 28, 330, 188, 96, 312];

/**
 * Per-category accent color from the shared hue. Lightness/saturation are tuned
 * for the dark scene; the light theme overrides these in CSS for contrast.
 */
export function categoryHsl(index: number): string {
  return `hsl(${SKILL_HUES[index % SKILL_HUES.length] ?? 212} 70% 62%)`;
}

const SkillsGalaxyScene = lazy(() => import('./SkillsGalaxyScene'));

/** Defensive WebGL capability check (server-safe). */
function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Interactive 3D "skills galaxy": each group is a glowing hub star with its
 * skills orbiting as smaller stars. Auto-rotates, supports drag-to-orbit, hover
 * highlighting, click-to-focus a cluster, category filter chips and search.
 *
 * The heavy R3F scene is lazily loaded and only mounted on the client when
 * WebGL is available. The grouped skills list is always rendered (visually
 * hidden behind the canvas) so keyboard and screen-reader users — and the
 * server-rendered HTML — always get the full, filterable content.
 */
export default function SkillsGalaxy({ groups }: SkillsGalaxyProps): React.JSX.Element {
  const [supported, setSupported] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [colors, setColors] = useState<GalaxyColors>({
    text: '#e9eefb',
    dim: '#9aa6c2',
    bg: '#05060a',
  });
  const [visible, setVisible] = useState<Set<string>>(() => new Set(groups.map((g) => g.id)));
  const [query, setQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusGroupId, setFocusGroupId] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);

  // Safety net so the loader never hangs if the GL context fails to create.
  useEffect(() => {
    if (!supported) return;
    const t = setTimeout(() => setSceneReady(true), 8000);
    return () => clearTimeout(t);
  }, [supported]);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    setSupported(hasWebGL());
    const cs = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string): string =>
      cs.getPropertyValue(name).trim() || fallback;
    setColors({
      text: read('--text', '#e9eefb'),
      dim: read('--text-dim', '#9aa6c2'),
      bg: read('--bg', '#05060a'),
    });
  }, []);

  const toggleGroup = (id: string): void =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const q = query.trim().toLowerCase();
  const matchCount = useMemo(() => {
    if (!q) return 0;
    return groups
      .filter((g) => visible.has(g.id))
      .reduce((acc, g) => acc + g.items.filter((it) => it.toLowerCase().includes(q)).length, 0);
  }, [q, groups, visible]);

  // Filtered data for the accessible list (mirrors the galaxy's filter+search).
  const listGroups = groups
    .filter((g) => visible.has(g.id))
    .map((g) => ({
      ...g,
      items: q ? g.items.filter((it) => it.toLowerCase().includes(q)) : g.items,
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="skills3d">
      <div className="skills3d__controls">
        <div className="skills3d__chips" role="group" aria-label="Filter skills by category">
          {groups.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className="skills3d__chip"
              style={{ '--chip-h': String(SKILL_HUES[i % SKILL_HUES.length] ?? 212) } as React.CSSProperties}
              aria-pressed={visible.has(g.id)}
              onClick={() => toggleGroup(g.id)}
            >
              {g.group}
            </button>
          ))}
        </div>
        <div className="skills3d__search">
          <label htmlFor="skill-search" className="visually-hidden">
            Search skills
          </label>
          <input
            id="skill-search"
            type="search"
            className="skills3d__input"
            placeholder="Search skills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby="skill-search-count"
          />
          <span id="skill-search-count" className="skills3d__count" aria-live="polite">
            {q ? `${matchCount} match${matchCount === 1 ? '' : 'es'}` : ''}
          </span>
        </div>
      </div>

      {supported && (
        <div
          className={`skills3d__stage ${sceneReady ? 'is-ready' : ''}`}
          data-lenis-prevent=""
        >
          <Suspense fallback={null}>
            <SkillsGalaxyScene
              groups={groups}
              visibleGroups={visible}
              query={query}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              focusGroupId={focusGroupId}
              setFocusGroupId={setFocusGroupId}
              reduced={reduced}
              colors={colors}
              onReady={() => setSceneReady(true)}
            />
          </Suspense>
          <CanvasLoader label="Charting the galaxy…" />
          {focusGroupId && (
            <button
              type="button"
              className="skills3d__reset"
              onClick={() => setFocusGroupId(null)}
            >
              Reset view
            </button>
          )}
          <p className="skills3d__hint" aria-hidden="true">
            Drag to orbit · click a hub to focus · hover to highlight
          </p>
        </div>
      )}

      <ul className={`skills3d__list ${supported ? 'is-visual' : ''}`}>
        {listGroups.map((g) => (
          <li key={g.id} className="skills3d__list-group">
            <strong>{g.group}</strong>
            <span>{g.items.join(' · ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

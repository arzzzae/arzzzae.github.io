import { useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface SkillGroup {
  id: string;
  group: string;
  weight: number;
  items: string[];
}

interface SkillsConstellationProps {
  groups: SkillGroup[];
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  groupIndex: number;
  isHub: boolean;
}

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const WIDTH = 1000;
const HEIGHT = 620;

/**
 * Deterministically lay out skill groups as a constellation: each group forms a
 * hub with its items orbiting around it. Pure layout based on the input data so
 * server and client render identically (avoids hydration mismatch).
 */
function layout(groups: SkillGroup[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const hubRadius = Math.min(WIDTH, HEIGHT) * 0.3;

  groups.forEach((group, gi) => {
    const hubAngle = (gi / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const hx = cx + Math.cos(hubAngle) * hubRadius;
    const hy = cy + Math.sin(hubAngle) * hubRadius;
    const hubId = `hub-${group.id}`;

    nodes.push({
      id: hubId,
      label: group.group,
      x: hx,
      y: hy,
      r: 8 + group.weight * 1.6,
      groupIndex: gi,
      isHub: true,
    });

    const orbit = 60 + group.weight * 6;
    group.items.forEach((item, ii) => {
      const a = (ii / group.items.length) * Math.PI * 2 + gi;
      const ix = hx + Math.cos(a) * orbit;
      const iy = hy + Math.sin(a) * orbit;
      nodes.push({
        id: `${group.id}-${ii}`,
        label: item,
        x: ix,
        y: iy,
        r: 4,
        groupIndex: gi,
        isHub: false,
      });
      edges.push({ x1: hx, y1: hy, x2: ix, y2: iy });
    });
  });

  return { nodes, edges };
}

/**
 * Animated SVG "skills constellation". Hubs are skill groups; orbiting nodes are
 * individual skills connected by lines. On scroll-in, edges draw and nodes pop;
 * afterwards nodes drift gently. Reduced-motion users get a static graph.
 */
export default function SkillsConstellation({
  groups,
}: SkillsConstellationProps): React.JSX.Element {
  const container = useRef<SVGSVGElement>(null);
  const { nodes, edges } = useMemo(() => layout(groups), [groups]);

  useGSAP(
    () => {
      const el = container.current;
      if (!el) return;
      const lineEls = el.querySelectorAll<SVGLineElement>('line');
      const nodeEls = el.querySelectorAll<SVGGElement>('.constellation__node');

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(lineEls, { opacity: 0.4 });
        gsap.set(nodeEls, { opacity: 1, scale: 1 });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top 75%' },
      });
      tl.from(lineEls, { opacity: 0, duration: 0.6, stagger: 0.01 }).from(
        nodeEls,
        {
          opacity: 0,
          scale: 0,
          transformOrigin: 'center',
          duration: 0.5,
          ease: 'back.out(2)',
          stagger: 0.02,
        },
        '-=0.3',
      );

      // gentle perpetual drift
      nodeEls.forEach((node, i) => {
        gsap.to(node, {
          y: `+=${(i % 2 === 0 ? 1 : -1) * 6}`,
          duration: 2 + (i % 5) * 0.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.03,
        });
      });
    },
    { scope: container },
  );

  return (
    <svg
      ref={container}
      className="constellation"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Skills constellation grouping technologies by category"
    >
      <g className="constellation__edges">
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
        ))}
      </g>
      <g className="constellation__nodes">
        {nodes.map((n) => (
          <g
            key={n.id}
            className={`constellation__node ${n.isHub ? 'is-hub' : ''}`}
            transform={`translate(${n.x} ${n.y})`}
          >
            <circle r={n.r} />
            <text
              y={n.isHub ? -n.r - 8 : -n.r - 5}
              className={n.isHub ? 'constellation__hub-label' : 'constellation__label'}
            >
              {n.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

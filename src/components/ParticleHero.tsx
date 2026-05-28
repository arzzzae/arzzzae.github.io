import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleText } from '../lib/textPoints';

interface ParticleTextProps {
  text: string;
  color: string;
}

function ParticleText({ text, color }: ParticleTextProps): React.JSX.Element | null {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const pointer = useRef(new THREE.Vector2(0, 0));

  // Sample the text once into target positions, plus a randomized start cloud
  // that particles fly in from. Generated at a fixed reference size; a group
  // scale (below) fits it responsively to the viewport.
  const data = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const { positions, count } = sampleText({
      text,
      density: 4,
      worldWidth: 10,
      fontSize: 180,
    });
    if (count === 0) return null;

    // bounding box of the formed text (centered on origin)
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < count; i++) {
      maxX = Math.max(maxX, Math.abs(positions[i * 3]));
      maxY = Math.max(maxY, Math.abs(positions[i * 3 + 1]));
    }
    const bboxW = maxX * 2 || 1;
    const bboxH = maxY * 2 || 1;

    const start = new Float32Array(count * 3);
    const random = new Float32Array(count); // per-particle phase offset
    for (let i = 0; i < count; i++) {
      start[i * 3] = (Math.random() - 0.5) * 20;
      start[i * 3 + 1] = (Math.random() - 0.5) * 20;
      start[i * 3 + 2] = (Math.random() - 0.5) * 10;
      random[i] = Math.random();
    }
    return { targets: positions, start, random, count, bboxW, bboxH };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Scale the whole text so it always fits the visible viewport with margin,
  // on both axes and at any aspect ratio (so it's never clipped).
  const fitScale = useMemo(() => {
    if (!data) return 1;
    const maxW = viewport.width * 0.85;
    const maxH = viewport.height * 0.5;
    return Math.min(maxW / data.bboxW, maxH / data.bboxH);
  }, [data, viewport.width, viewport.height]);

  const geometry = useMemo(() => {
    if (!data) return null;
    const geo = new THREE.BufferGeometry();
    // begin at the start cloud
    geo.setAttribute('position', new THREE.BufferAttribute(data.start.slice(), 3));
    return geo;
  }, [data]);

  useFrame((state) => {
    if (!data || !geometry || !pointsRef.current) return;
    const elapsed = state.clock.elapsedTime;
    // formation progress eased over the first ~2.2s
    const t = Math.min(elapsed / 2.2, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    // smooth pointer for parallax
    pointer.current.x += (state.pointer.x - pointer.current.x) * 0.05;
    pointer.current.y += (state.pointer.y - pointer.current.y) * 0.05;

    for (let i = 0; i < data.count; i++) {
      const ix = i * 3;
      const tx = data.targets[ix];
      const ty = data.targets[ix + 1];
      const tz = data.targets[ix + 2];

      if (reduced) {
        arr[ix] = tx;
        arr[ix + 1] = ty;
        arr[ix + 2] = tz;
        continue;
      }

      const sx = data.start[ix];
      const sy = data.start[ix + 1];
      const sz = data.start[ix + 2];

      // gentle idle drift once formed
      const phase = data.random[i] * Math.PI * 2;
      const drift = t >= 1 ? Math.sin(elapsed * 0.8 + phase) * 0.04 : 0;

      arr[ix] = THREE.MathUtils.lerp(sx, tx, ease) + drift;
      arr[ix + 1] = THREE.MathUtils.lerp(sy, ty, ease) + drift;
      arr[ix + 2] = THREE.MathUtils.lerp(sz, tz, ease);
    }
    attr.needsUpdate = true;

    // subtle cursor parallax rotation
    pointsRef.current.rotation.y = pointer.current.x * 0.15;
    pointsRef.current.rotation.x = -pointer.current.y * 0.1;
  });

  if (!geometry) return null;

  return (
    <group scale={fitScale}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          color={color}
          size={0.045}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

interface ParticleHeroProps {
  /** Text the particles form. */
  text?: string;
}

/**
 * 3D particle hero: thousands of points fly in to form the given text, drift
 * gently, and parallax with the cursor. Mounted as a `client:load` island.
 * Reduced-motion users get the formed text immediately with no animation.
 */
export default function ParticleHero({ text = 'arzzzae' }: ParticleHeroProps): React.JSX.Element {
  // Particle color follows the theme via a CSS variable read at mount.
  const color =
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
      ? '#1b2a4a'
      : '#7fb2ff';

  return (
    <div className="particle-hero" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 14], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ParticleText text={text} color={color} />
      </Canvas>
    </div>
  );
}

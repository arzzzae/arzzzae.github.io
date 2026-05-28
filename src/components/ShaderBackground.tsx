import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Animated flowing gradient using layered value noise. Color stops are passed
// in as uniforms so the background can react to the active light/dark theme.
const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2(uv.x * aspect, uv.y);
    p += (uMouse * 0.15);

    float t = uTime * 0.06;
    float n = noise(p * 2.0 + t) * 0.5 + noise(p * 4.0 - t) * 0.25 + noise(p * 8.0 + t * 0.5) * 0.125;
    n = n * 0.5 + 0.5;

    vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.8, n));
    col = mix(col, uColorC, smoothstep(0.6, 1.0, n + 0.15 * sin(t + uv.x * 3.14)));

    // subtle vignette
    float d = distance(uv, vec2(0.5));
    col *= 1.0 - d * 0.5;

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Palette {
  a: string;
  b: string;
  c: string;
}

const DARK: Palette = { a: '#05060a', b: '#0d1b2a', c: '#1b2a4a' };
const LIGHT: Palette = { a: '#eef2f9', b: '#dde6f5', c: '#cdd9ef' };

function GradientPlane(): React.JSX.Element {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const mouse = useRef(new THREE.Vector2(0, 0));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color(DARK.a) },
      uColorB: { value: new THREE.Color(DARK.b) },
      uColorC: { value: new THREE.Color(DARK.c) },
    }),
    // size intentionally excluded — resolution is updated in useFrame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uResolution.value.set(state.size.width, state.size.height);

    // ease mouse
    const px = (state.pointer.x + 1) / 2;
    const py = (state.pointer.y + 1) / 2;
    mouse.current.x += (px - mouse.current.x) * 0.05;
    mouse.current.y += (py - mouse.current.y) * 0.05;
    mat.uniforms.uMouse.value.copy(mouse.current);

    // theme-aware palette
    const isLight = document.documentElement.dataset.theme === 'light';
    const palette = isLight ? LIGHT : DARK;
    (mat.uniforms.uColorA.value as THREE.Color).lerp(new THREE.Color(palette.a), 0.05);
    (mat.uniforms.uColorB.value as THREE.Color).lerp(new THREE.Color(palette.b), 0.05);
    (mat.uniforms.uColorC.value as THREE.Color).lerp(new THREE.Color(palette.c), 0.05);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Fixed, full-viewport WebGL shader gradient that sits behind all content.
 * Mounted as a `client:idle` island. Reduced-motion users get a static CSS
 * background instead (handled in the layout), so this only renders when motion
 * is allowed.
 */
export default function ShaderBackground(): React.JSX.Element {
  return (
    <div className="shader-bg" aria-hidden="true">
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{ position: [0, 0, 1] }}
      >
        <GradientPlane />
      </Canvas>
    </div>
  );
}

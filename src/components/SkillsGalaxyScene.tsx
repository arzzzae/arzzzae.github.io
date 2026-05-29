import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Line, OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SkillGroup, GalaxyColors } from './SkillsGalaxy';

/** Minimal shape of the drei/three OrbitControls instance we touch. */
interface ControlsLike {
  target: THREE.Vector3;
  autoRotate: boolean;
  autoRotateSpeed: number;
  update: () => void;
}

interface SceneProps {
  groups: SkillGroup[];
  visibleGroups: Set<string>;
  query: string;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  focusGroupId: string | null;
  setFocusGroupId: (id: string | null) => void;
  reduced: boolean;
  colors: GalaxyColors;
}

interface GNode {
  id: string;
  label: string;
  groupId: string;
  isHub: boolean;
  pos: THREE.Vector3;
  r: number;
  color: THREE.Color;
}

interface GEdge {
  groupId: string;
  a: THREE.Vector3;
  b: THREE.Vector3;
  color: THREE.Color;
}

const ORIGIN = new THREE.Vector3(0, 0, 0);
const HUE_PALETTE = [212, 268, 150, 28, 330, 188, 96, 312];

/** Tiny deterministic PRNG so the galaxy layout is stable across renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Lay the skill groups out as a flattened galactic disc: each group is a hub
 * star on the disc with its skills scattered in a small cluster around it.
 * Deterministic (seeded) so positions never jump between renders.
 */
function buildLayout(groups: SkillGroup[]): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const discR = 6.2;
  const n = Math.max(groups.length, 1);

  groups.forEach((group, gi) => {
    const color = new THREE.Color().setHSL(
      (HUE_PALETTE[gi % HUE_PALETTE.length] ?? 210) / 360,
      0.7,
      0.62,
    );
    const angle = (gi / n) * Math.PI * 2;
    const rng = mulberry32(hashSeed(group.id));
    const hub = new THREE.Vector3(
      Math.cos(angle) * discR,
      (rng() - 0.5) * 1.4,
      Math.sin(angle) * discR,
    );
    const hubId = `hub-${group.id}`;
    nodes.push({
      id: hubId,
      label: group.group,
      groupId: group.id,
      isHub: true,
      pos: hub,
      r: 0.34 + group.weight * 0.035,
      color,
    });

    const clusterR = 1.5 + Math.min(group.items.length, 12) * 0.12;
    group.items.forEach((item, ii) => {
      // even-ish spherical scatter with jitter, flattened on Y for the disc look
      const u = rng();
      const v = rng();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const rad = clusterR * (0.55 + rng() * 0.45);
      const pos = new THREE.Vector3(
        hub.x + Math.sin(phi) * Math.cos(theta) * rad,
        hub.y + Math.cos(phi) * rad * 0.55,
        hub.z + Math.sin(phi) * Math.sin(theta) * rad,
      );
      nodes.push({
        id: `${group.id}-${ii}`,
        label: item,
        groupId: group.id,
        isHub: false,
        pos,
        r: 0.12,
        color,
      });
      edges.push({ groupId: group.id, a: hub, b: pos, color });
    });
  });

  return { nodes, edges };
}

type Emphasis = 'emphasized' | 'normal' | 'dim';

export default function SkillsGalaxyScene({
  groups,
  visibleGroups,
  query,
  hoveredId,
  setHoveredId,
  focusGroupId,
  setFocusGroupId,
  reduced,
  colors,
}: SceneProps): React.JSX.Element {
  const { nodes, edges } = useMemo(() => buildLayout(groups), [groups]);
  const groupOfNode = useMemo(() => {
    const m = new Map<string, string>();
    nodes.forEach((nd) => m.set(nd.id, nd.groupId));
    return m;
  }, [nodes]);

  const q = query.trim().toLowerCase();
  const hoveredGroup = hoveredId ? groupOfNode.get(hoveredId) : undefined;

  // Precedence: filter (handled by skipping hidden groups) > search > hover > focus.
  const emphasisFor = (nd: GNode): Emphasis => {
    if (q) return nd.label.toLowerCase().includes(q) ? 'emphasized' : 'dim';
    if (hoveredId) {
      if (nd.id === hoveredId) return 'emphasized';
      return nd.groupId === hoveredGroup ? 'normal' : 'dim';
    }
    if (focusGroupId) return nd.groupId === focusGroupId ? 'emphasized' : 'dim';
    return 'normal';
  };

  const textColor = colors.text || '#e9eefb';

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 4.5, 15], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => setFocusGroupId(null)}
    >
      <SceneContents
        nodes={nodes}
        edges={edges}
        visibleGroups={visibleGroups}
        emphasisFor={emphasisFor}
        textColor={textColor}
        bg={colors.bg || '#05060a'}
        reduced={reduced}
        focusGroupId={focusGroupId}
        setHoveredId={setHoveredId}
        setFocusGroupId={setFocusGroupId}
      />
    </Canvas>
  );
}

interface ContentsProps {
  nodes: GNode[];
  edges: GEdge[];
  visibleGroups: Set<string>;
  emphasisFor: (nd: GNode) => Emphasis;
  textColor: string;
  bg: string;
  reduced: boolean;
  focusGroupId: string | null;
  setHoveredId: (id: string | null) => void;
  setFocusGroupId: (id: string | null) => void;
}

function SceneContents({
  nodes,
  edges,
  visibleGroups,
  emphasisFor,
  textColor,
  bg,
  reduced,
  focusGroupId,
  setHoveredId,
  setFocusGroupId,
}: ContentsProps): React.JSX.Element {
  const controlsRef = useRef<ControlsLike | null>(null);
  const draggingRef = useRef(false);

  const focusPos = useMemo(() => {
    if (!focusGroupId) return null;
    const hub = nodes.find((nd) => nd.isHub && nd.groupId === focusGroupId);
    return hub ? hub.pos : null;
  }, [focusGroupId, nodes]);

  const toggleFocus = (groupId: string): void =>
    setFocusGroupId(focusGroupId === groupId ? null : groupId);

  const visibleEdges = edges.filter((e) => visibleGroups.has(e.groupId));

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 14, 30]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 6, 8]} intensity={60} distance={60} decay={2} />
      <Stars radius={60} depth={40} count={1400} factor={3.2} saturation={0} fade speed={0.6} />

      {/* galactic core glow */}
      <mesh>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshBasicMaterial color="#9ec3ff" transparent opacity={0.22} />
      </mesh>

      {visibleEdges.map((e, i) => {
        const dim = focusGroupId && e.groupId !== focusGroupId;
        return (
          <Line
            key={i}
            points={[e.a, e.b]}
            color={e.color}
            lineWidth={1}
            transparent
            opacity={dim ? 0.05 : 0.18}
          />
        );
      })}

      {nodes
        .filter((nd) => visibleGroups.has(nd.groupId))
        .map((nd) => {
          const emphasis = emphasisFor(nd);
          const meshOpacity = emphasis === 'dim' ? 0.18 : 1;
          const emissive = emphasis === 'emphasized' ? 1.6 : emphasis === 'dim' ? 0.15 : 0.7;
          const labelOpacity = emphasis === 'dim' ? 0.12 : emphasis === 'emphasized' ? 1 : 0.7;
          const fontSize = nd.isHub ? 0.5 : 0.3;
          return (
            <group key={nd.id} position={nd.pos}>
              <mesh
                onPointerOver={(ev) => {
                  ev.stopPropagation();
                  setHoveredId(nd.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(ev) => {
                  ev.stopPropagation();
                  setHoveredId(null);
                  document.body.style.cursor = '';
                }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggleFocus(nd.groupId);
                }}
              >
                <sphereGeometry args={[nd.r, nd.isHub ? 28 : 16, nd.isHub ? 28 : 16]} />
                <meshStandardMaterial
                  color={nd.color}
                  emissive={nd.color}
                  emissiveIntensity={emissive}
                  transparent
                  opacity={meshOpacity}
                  roughness={0.4}
                  metalness={0.1}
                />
              </mesh>
              <Billboard position={[0, nd.r + (nd.isHub ? 0.42 : 0.26), 0]}>
                <Text
                  fontSize={fontSize}
                  color={textColor}
                  anchorX="center"
                  anchorY="middle"
                  fillOpacity={labelOpacity}
                  outlineWidth={0.012}
                  outlineColor={bg}
                  outlineOpacity={labelOpacity}
                >
                  {nd.label}
                </Text>
              </Billboard>
            </group>
          );
        })}

      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={5}
        maxDistance={26}
        autoRotate={!reduced}
        autoRotateSpeed={0.45}
        onStart={() => {
          draggingRef.current = true;
        }}
        onEnd={() => {
          draggingRef.current = false;
        }}
      />
      <CameraRig
        focusPos={focusPos}
        focusGroupId={focusGroupId}
        reduced={reduced}
        controlsRef={controlsRef}
        draggingRef={draggingRef}
      />
    </>
  );
}

interface RigProps {
  focusPos: THREE.Vector3 | null;
  focusGroupId: string | null;
  reduced: boolean;
  controlsRef: React.MutableRefObject<ControlsLike | null>;
  draggingRef: React.MutableRefObject<boolean>;
}

function CameraRig({ focusPos, focusGroupId, reduced, controlsRef, draggingRef }: RigProps): null {
  const { camera } = useThree();
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
  }, [focusGroupId]);

  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    // Auto-rotate only in the calm overview state.
    c.autoRotate = !reduced && !draggingRef.current && !focusGroupId;

    if (focusPos) {
      const outward = focusPos.clone().sub(ORIGIN).normalize();
      const desired = focusPos.clone().add(outward.multiplyScalar(4)).add(new THREE.Vector3(0, 1.8, 0));
      if (!settled.current) {
        if (reduced) camera.position.copy(desired);
        else camera.position.lerp(desired, 0.07);
        if (camera.position.distanceTo(desired) < 0.18) settled.current = true;
      }
      if (reduced) c.target.copy(focusPos);
      else c.target.lerp(focusPos, 0.09);
    } else if (!draggingRef.current) {
      if (reduced) c.target.set(0, 0, 0);
      else c.target.lerp(ORIGIN, 0.05);
    }
    c.update();
  });

  return null;
}

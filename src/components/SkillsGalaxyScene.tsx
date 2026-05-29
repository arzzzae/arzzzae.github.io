import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Line, OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SkillGroup, GalaxyColors } from './SkillsGalaxy';
import { SKILL_HUES } from './SkillsGalaxy';

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
  titleRef: React.RefObject<HTMLDivElement | null>;
  resetNonce: number;
  onUserInteract: () => void;
  onReset: () => void;
  onReady?: () => void;
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
// Initial birds-eye camera position; must match the <Canvas camera> prop below.
const HOME = new THREE.Vector3(0, 24, 11);

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
  const discR = 8.6;
  const n = Math.max(groups.length, 1);

  groups.forEach((group, gi) => {
    const color = new THREE.Color().setHSL(
      (SKILL_HUES[gi % SKILL_HUES.length] ?? 210) / 360,
      0.7,
      0.62,
    );
    const angle = (gi / n) * Math.PI * 2;
    const rng = mulberry32(hashSeed(group.id));
    const hub = new THREE.Vector3(
      Math.cos(angle) * discR,
      (rng() - 0.5) * 1.6,
      Math.sin(angle) * discR,
    );
    const hubId = `hub-${group.id}`;
    nodes.push({
      id: hubId,
      label: group.group,
      groupId: group.id,
      isHub: true,
      pos: hub,
      r: 0.4 + Math.min(group.items.length, 14) * 0.06,
      color,
    });

    const clusterR = 2.4 + Math.min(group.items.length, 12) * 0.2;
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
  titleRef,
  resetNonce,
  onUserInteract,
  onReset,
  onReady,
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

  // Skill (moon) labels are hidden by default to reduce crowding in dense
  // clusters; a cluster reveals its skill labels on hover, focus, or search.
  const skillLabelVisible = (nd: GNode): boolean => {
    if (nd.isHub) return true;
    if (q) return nd.label.toLowerCase().includes(q);
    if (hoveredId) return nd.groupId === hoveredGroup;
    if (focusGroupId) return nd.groupId === focusGroupId;
    return false;
  };

  const textColor = colors.text || '#e9eefb';

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 24, 11], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={(e) => {
        // Only a plain left-click on empty space resets; right-drag pans.
        if ((e as MouseEvent).button === 0) onReset();
      }}
      onCreated={() => onReady?.()}
    >
      <SceneContents
        nodes={nodes}
        edges={edges}
        visibleGroups={visibleGroups}
        emphasisFor={emphasisFor}
        skillLabelVisible={skillLabelVisible}
        textColor={textColor}
        bg={colors.bg || '#05060a'}
        reduced={reduced}
        focusGroupId={focusGroupId}
        setHoveredId={setHoveredId}
        setFocusGroupId={setFocusGroupId}
        titleRef={titleRef}
        resetNonce={resetNonce}
        onUserInteract={onUserInteract}
      />
    </Canvas>
  );
}

interface ContentsProps {
  nodes: GNode[];
  edges: GEdge[];
  visibleGroups: Set<string>;
  emphasisFor: (nd: GNode) => Emphasis;
  skillLabelVisible: (nd: GNode) => boolean;
  textColor: string;
  bg: string;
  reduced: boolean;
  focusGroupId: string | null;
  setHoveredId: (id: string | null) => void;
  setFocusGroupId: (id: string | null) => void;
  titleRef: React.RefObject<HTMLDivElement | null>;
  resetNonce: number;
  onUserInteract: () => void;
}

function SceneContents({
  nodes,
  edges,
  visibleGroups,
  emphasisFor,
  skillLabelVisible,
  textColor,
  bg,
  reduced,
  focusGroupId,
  setHoveredId,
  setFocusGroupId,
  titleRef,
  resetNonce,
  onUserInteract,
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
      <fog attach="fog" args={[bg, 24, 58]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 14, 10]} intensity={120} distance={90} decay={2} />
      <Stars radius={90} depth={50} count={1800} factor={3.6} saturation={0} fade speed={0.6} />

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
          // Hub labels are the primary navigation cues, so keep them fully
          // opaque in the overview (0.7 read as muddy grey on the dark sky);
          // skill (moon) labels stay lighter to reduce crowding.
          const baseLabelOpacity =
            emphasis === 'dim' ? 0.12 : emphasis === 'emphasized' ? 1 : nd.isHub ? 1 : 0.7;
          // The focused hub's label is lifted out into the pinned corner title,
          // so hide its in-scene label to avoid the big text overlapping skills.
          const isFocusedHub = nd.isHub && nd.groupId === focusGroupId;
          const labelOpacity = isFocusedHub
            ? 0
            : skillLabelVisible(nd)
              ? baseLabelOpacity
              : 0;
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
              <Billboard position={[0, nd.r + (nd.isHub ? 0.72 : 0.32), 0]}>
                <Text
                  fontSize={fontSize}
                  color={textColor}
                  anchorX="center"
                  anchorY="middle"
                  fillOpacity={labelOpacity}
                  outlineWidth={nd.isHub ? 0.03 : 0.016}
                  outlineColor={bg}
                  outlineOpacity={Math.min(1, labelOpacity + 0.25)}
                  outlineBlur={nd.isHub ? '28%' : '18%'}
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
        enablePan
        screenSpacePanning
        minDistance={7}
        maxDistance={46}
        autoRotate={!reduced}
        autoRotateSpeed={0.16}
        onStart={() => {
          draggingRef.current = true;
          // Any manual orbit/zoom counts as moving away from the start view.
          onUserInteract();
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
        titleRef={titleRef}
        resetNonce={resetNonce}
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
  titleRef: React.RefObject<HTMLDivElement | null>;
  resetNonce: number;
}

function CameraRig({
  focusPos,
  focusGroupId,
  reduced,
  controlsRef,
  draggingRef,
  titleRef,
  resetNonce,
}: RigProps): null {
  const { camera, size } = useThree();
  const settled = useRef(false);
  const homeSettled = useRef(false);
  // Title fly animation: progress 0 = tucked into the hub node, 1 = pinned in
  // the corner. `lastHub` remembers the hub position so the title can animate
  // back into it after focus is cleared.
  const titleProg = useRef(0);
  const lastHub = useRef(new THREE.Vector3());
  const projected = useRef(new THREE.Vector3());

  useEffect(() => {
    // Re-animate on every focus change: into a cluster, or back to birds-eye.
    settled.current = false;
    homeSettled.current = false;
  }, [focusGroupId]);

  useEffect(() => {
    // Reset requested (button / right-click / empty click): force a fly-home
    // even if the user had previously settled the overview by dragging.
    if (resetNonce === 0) return;
    settled.current = false;
    homeSettled.current = false;
  }, [resetNonce]);

  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    // Auto-rotate only once we're calmly settled in the birds-eye overview.
    c.autoRotate =
      !reduced && !draggingRef.current && !focusGroupId && homeSettled.current;

    if (focusPos) {
      lastHub.current.copy(focusPos);
      const outward = focusPos.clone().sub(ORIGIN).normalize();
      const desired = focusPos.clone().add(outward.multiplyScalar(5.5)).add(new THREE.Vector3(0, 4, 0));
      if (!settled.current) {
        if (reduced) camera.position.copy(desired);
        else camera.position.lerp(desired, 0.07);
        if (camera.position.distanceTo(desired) < 0.18) settled.current = true;
      }
      if (reduced) c.target.copy(focusPos);
      else c.target.lerp(focusPos, 0.09);
    } else if (!draggingRef.current) {
      // No cluster focused: fly the camera back to the initial birds-eye view.
      // Once home (or if the user grabs the controls) stop forcing it so the
      // overview can be freely orbited.
      if (!homeSettled.current) {
        if (reduced) {
          camera.position.copy(HOME);
          c.target.copy(ORIGIN);
          homeSettled.current = true;
        } else {
          camera.position.lerp(HOME, 0.06);
          c.target.lerp(ORIGIN, 0.06);
          if (camera.position.distanceTo(HOME) < 0.25) homeSettled.current = true;
        }
      }
      // Once settled at home we stop forcing the target so the user can freely
      // orbit AND pan (right-drag) the overview; Reset returns to ORIGIN/HOME.
    } else {
      // User is dragging the overview — let them; don't fight their orbit.
      homeSettled.current = true;
    }
    c.update();

    // Drive the pinned corner title: animate it between the hub node's
    // projected screen position and the upper-left corner.
    const el = titleRef.current;
    if (el) {
      const target = focusPos ? 1 : 0;
      titleProg.current = reduced
        ? target
        : titleProg.current + (target - titleProg.current) * 0.12;
      const prog = titleProg.current;

      if (prog < 0.002 && target === 0) {
        el.style.opacity = '0';
      } else {
        projected.current.copy(lastHub.current).project(camera);
        const nodeX = (projected.current.x * 0.5 + 0.5) * size.width;
        const nodeY = (-projected.current.y * 0.5 + 0.5) * size.height;
        const scale = 0.45 + 0.55 * prog;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const cornerX = 22;
        const cornerY = 18;
        // Lerp the (scale-aware) top-left from "centered on node" to "corner".
        const x = (nodeX - (w * scale) / 2) * (1 - prog) + cornerX * prog;
        const y = (nodeY - (h * scale) / 2) * (1 - prog) + cornerY * prog;
        el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        el.style.opacity = String(prog * prog * (3 - 2 * prog));
      }
    }
  });

  return null;
}

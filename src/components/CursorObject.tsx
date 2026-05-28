import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function FloatingKnot(): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced) {
      // map normalized pointer to a constrained area of the viewport
      target.current.set(
        (state.pointer.x * viewport.width) / 4,
        (state.pointer.y * viewport.height) / 4,
        0,
      );
      mesh.position.lerp(target.current, 0.04);
    }
    mesh.rotation.x += 0.003;
    mesh.rotation.y += 0.004;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.4, 8]} />
        <MeshDistortMaterial
          color="#4f7cff"
          emissive="#13204a"
          roughness={0.2}
          metalness={0.6}
          distort={0.35}
          speed={1.5}
        />
      </mesh>
    </Float>
  );
}

/**
 * A glossy, distorted 3D object that floats and eases toward the cursor.
 * Mounted as a `client:visible` island so it only initializes when scrolled
 * into view. Lighting is simple and self-contained.
 */
export default function CursorObject(): React.JSX.Element {
  return (
    <div className="cursor-object" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 5]} intensity={1.4} />
        <pointLight position={[-4, -2, 2]} intensity={0.8} color="#7fb2ff" />
        <FloatingKnot />
      </Canvas>
    </div>
  );
}

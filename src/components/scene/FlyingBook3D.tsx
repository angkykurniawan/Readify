import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { FlyingBookAnim } from '../../types/library';

export function FlyingBook3D({ anim }: { anim: FlyingBookAnim }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const p0 = new THREE.Vector3(...anim.from);
  const p2 = new THREE.Vector3(...anim.to);
  const p1 = new THREE.Vector3(
    (p0.x + p2.x) / 2,
    Math.max(p0.y, p2.y) + 4.8,
    (p0.z + p2.z) / 2
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const elapsed = Date.now() - anim.startedAt;
    const rawT = Math.min(1, Math.max(0, elapsed / anim.durationMs));
    // Smooth ease-in-out cubic
    const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

    // Quadratic Bézier curve
    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
    const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
    const z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * p1.z + t * t * p2.z;

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y = t * Math.PI * 2;
    const scale = rawT > 0.88 ? 1 + (1 - rawT) * 2.5 : Math.min(1.35, 0.7 + Math.sin(rawT * Math.PI) * 0.7);
    groupRef.current.scale.setScalar(scale);

    // Subtle open-book flapping effect
    const flap = 0.35 + Math.sin(clock.getElapsedTime() * 11) * 0.25;
    if (leftWingRef.current) leftWingRef.current.rotation.z = flap;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -flap;
    if (ringRef.current) ringRef.current.rotation.z = clock.getElapsedTime() * 4;
  });

  const isBorrow = anim.type === 'borrow';

  return (
    <group ref={groupRef} position={anim.from}>
      {/* Open glowing flying book */}
      <mesh ref={leftWingRef} position={[-0.16, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.04, 0.42]} />
        <meshStandardMaterial
          color={anim.coverColor}
          emissive={anim.coverColor}
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh ref={rightWingRef} position={[0.16, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.04, 0.42]} />
        <meshStandardMaterial
          color={anim.coverColor}
          emissive={anim.coverColor}
          emissiveIntensity={0.45}
        />
      </mesh>
      {/* Cream inner pages */}
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[0.48, 0.025, 0.38]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fef08a" emissiveIntensity={0.4} />
      </mesh>
      {/* Orbiting magic glow ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.025, 8, 28]} />
        <meshStandardMaterial
          color={isBorrow ? '#38bdf8' : '#34d399'}
          emissive={isBorrow ? '#0284c7' : '#059669'}
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Floating Action Stamp */}
      <Html position={[0, 0.65, 0]} center distanceFactor={20} zIndexRange={[40, 0]}>
        <div
          className={`pointer-events-none flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold text-white shadow-lg whitespace-nowrap ${
            isBorrow ? 'bg-blue-600' : 'bg-emerald-600'
          }`}
        >
          <span>{isBorrow ? '📤 DIPINJAM' : '📥 DIKEMBALIKAN'}</span>
          <span className="opacity-85">• {anim.bookTitle.slice(0, 22)}</span>
        </div>
      </Html>
    </group>
  );
}

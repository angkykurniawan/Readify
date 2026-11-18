import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function StylizedTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.9, 8]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <dodecahedronGeometry args={[0.68, 1]} />
        <meshStandardMaterial color="#34a853" roughness={0.8} />
      </mesh>
      <mesh position={[0.28, 1.05, 0.2]} castShadow>
        <dodecahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial color="#2e9348" roughness={0.85} />
      </mesh>
    </group>
  );
}

function ParkBench({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[1.35, 0.08, 0.42]} />
        <meshStandardMaterial color="#c28e5c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.58, -0.18]} rotation={[-0.18, 0, 0]} castShadow>
        <boxGeometry args={[1.35, 0.34, 0.07]} />
        <meshStandardMaterial color="#b07d4f" roughness={0.8} />
      </mesh>
      <mesh position={[-0.52, 0.16, 0]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.38]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0.52, 0.16, 0]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.38]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.065, 2.8, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.82, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function MovingCar({
  axis,
  fixedCoord,
  range,
  speed,
  offset,
  color,
}: {
  axis: 'x' | 'z';
  fixedCoord: number;
  range: number;
  speed: number;
  offset: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + offset;
    const span = range * 2;
    const pos = (((t % span) + span) % span) - range;
    if (axis === 'x') {
      ref.current.position.set(pos, 0.22, fixedCoord);
      ref.current.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      ref.current.position.set(fixedCoord, 0.22, pos);
      ref.current.rotation.y = speed > 0 ? 0 : Math.PI;
    }
  });

  return (
    <group ref={ref}>
      {/* Body */}
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[1.05, 0.38, 2.05]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.54, -0.08]} castShadow>
        <boxGeometry args={[0.9, 0.3, 1.1]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.2} />
      </mesh>
      {/* Wheels */}
      {[
        [-0.52, 0.05, 0.62],
        [0.52, 0.05, 0.62],
        [-0.52, 0.05, -0.62],
        [0.52, 0.05, -0.62],
      ].map((p, idx) => (
        <mesh key={idx} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.17, 0.17, 0.14, 10]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function CampusEnvironment() {
  return (
    <group>
      {/* Clean studio backdrop ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial color="#eef1f5" roughness={1} />
      </mesh>

      {/* Main sidewalk / raised campus slab */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[34.4, 0.18, 25.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.85} />
      </mesh>
      {/* Curb trim */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[34.8, 0.08, 25.8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>

      {/* Perimeter Asphalt Roads (South, East, West, North) */}
      {/* South front avenue */}
      <mesh position={[0, -0.17, 15.2]} receiveShadow>
        <boxGeometry args={[46, 0.05, 4.4]} />
        <meshStandardMaterial color="#475569" roughness={0.95} />
      </mesh>
      {/* North avenue */}
      <mesh position={[0, -0.17, -15.2]} receiveShadow>
        <boxGeometry args={[46, 0.05, 4.2]} />
        <meshStandardMaterial color="#475569" roughness={0.95} />
      </mesh>
      {/* West avenue */}
      <mesh position={[-19.8, -0.17, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.05, 34.8]} />
        <meshStandardMaterial color="#475569" roughness={0.95} />
      </mesh>
      {/* East avenue */}
      <mesh position={[19.8, -0.17, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.05, 34.8]} />
        <meshStandardMaterial color="#475569" roughness={0.95} />
      </mesh>

      {/* Dashed road markings on South Road */}
      {Array.from({ length: 13 }).map((_, idx) => {
        const x = -18 + idx * 3;
        if (Math.abs(x) < 2.2) return null; // ruang untuk zebra cross
        return (
          <mesh key={`dash-s-${idx}`} position={[x, -0.14, 15.2]}>
            <boxGeometry args={[1.4, 0.01, 0.14]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
        );
      })}
      {/* Dashed road markings on West & East Roads */}
      {Array.from({ length: 9 }).map((_, idx) => {
        const z = -12 + idx * 3;
        return (
          <group key={`dash-we-${idx}`}>
            <mesh position={[-19.8, -0.14, z]}>
              <boxGeometry args={[0.14, 0.01, 1.4]} />
              <meshStandardMaterial color="#f1f5f9" />
            </mesh>
            <mesh position={[19.8, -0.14, z]}>
              <boxGeometry args={[0.14, 0.01, 1.4]} />
              <meshStandardMaterial color="#f1f5f9" />
            </mesh>
          </group>
        );
      })}

      {/* Zebra Crosswalk tepat di depan gerbang utama Readify */}
      {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((x, idx) => (
        <mesh key={`zebra-${idx}`} position={[x, -0.135, 15.2]}>
          <boxGeometry args={[0.36, 0.015, 3.6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Stylized Trees around the campus perimeter */}
      <StylizedTree position={[-16.2, 0, -11.6]} scale={1.05} />
      <StylizedTree position={[16.2, 0, -11.6]} scale={1.1} />
      <StylizedTree position={[-16.2, 0, 11.4]} scale={1.0} />
      <StylizedTree position={[16.2, 0, 11.4]} scale={1.08} />
      <StylizedTree position={[-16.4, 0, 0]} scale={0.92} />
      <StylizedTree position={[16.4, 0, 0]} scale={0.95} />
      <StylizedTree position={[-6.5, 0, 11.8]} scale={0.85} />
      <StylizedTree position={[6.5, 0, 11.8]} scale={0.85} />

      {/* Park Benches along front & sides */}
      <ParkBench position={[-10.5, 0, 11.7]} rotationY={0} />
      <ParkBench position={[10.5, 0, 11.7]} rotationY={0} />
      <ParkBench position={[-16.2, 0, -5.5]} rotationY={Math.PI / 2} />
      <ParkBench position={[16.2, 0, 5.5]} rotationY={-Math.PI / 2} />

      {/* Street Lamps */}
      <StreetLamp position={[-13.5, 0, 12.1]} />
      <StreetLamp position={[-3.2, 0, 12.1]} />
      <StreetLamp position={[3.2, 0, 12.1]} />
      <StreetLamp position={[13.5, 0, 12.1]} />
      <StreetLamp position={[-16.5, 0, -8.5]} />
      <StreetLamp position={[16.5, 0, -8.5]} />

      {/* Animated low-poly cars matching reference vibe */}
      <MovingCar axis="x" fixedCoord={14.1} range={22} speed={3.2} offset={4} color="#f97316" />
      <MovingCar axis="x" fixedCoord={16.2} range={22} speed={-2.6} offset={12} color="#10b981" />
      <MovingCar axis="z" fixedCoord={-18.8} range={16} speed={2.9} offset={2} color="#3b82f6" />
      <MovingCar axis="z" fixedCoord={20.8} range={16} speed={-2.4} offset={9} color="#eab308" />
    </group>
  );
}

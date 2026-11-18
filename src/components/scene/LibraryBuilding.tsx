import { Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useState } from 'react';
import { ACTIVITY_SPOTS, getActivitySpotById } from '../../data/activities';
import { CIRCULATION_DESK_POS, ZONE_LIST, type ZoneDefinition } from '../../data/zones';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { ActivitySpot } from '../../types/library';

function GlassWall({
  position,
  length,
  rotationY = 0,
  hasDoorGap = false,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
  hasDoorGap?: boolean;
}) {
  const height = 2.15;
  const gap = 2.4;
  if (hasDoorGap && length > gap + 0.8) {
    const segLen = (length - gap) / 2;
    const offset = segLen / 2 + gap / 2;
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {[-offset, offset].map((x, idx) => (
          <group key={idx} position={[x, 0, 0]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[segLen, height, 0.06]} />
              <meshPhysicalMaterial
                color="#dbeafe"
                transparent
                opacity={0.28}
                roughness={0.1}
                metalness={0.05}
              />
            </mesh>
            <mesh position={[0, height, 0]}>
              <boxGeometry args={[segLen, 0.07, 0.09]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[segLen, 0.1, 0.09]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, height, 0]}>
          <boxGeometry args={[gap, 0.09, 0.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[length, height, 0.06]} />
        <meshPhysicalMaterial
          color="#e2e8f0"
          transparent
          opacity={0.26}
          roughness={0.12}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[length, 0.07, 0.09]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[length, 0.1, 0.09]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

function ZoneRoom({ zone, isActive }: { zone: ZoneDefinition; isActive: boolean }) {
  const [cx, cz] = zone.center;
  const [w, d] = zone.size;
  const focusZone = useLibraryStore((s) => s.focusZone);

  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[w, 0.05, d]} />
        <meshStandardMaterial
          color={zone.floorColor}
          roughness={0.85}
          emissive={isActive ? zone.accentColor : '#000000'}
          emissiveIntensity={isActive ? 0.08 : 0}
        />
      </mesh>

      <mesh position={[0, 0.048, -d / 2 + 0.08]}>
        <boxGeometry args={[w, 0.01, 0.12]} />
        <meshStandardMaterial color={zone.accentColor} roughness={0.5} />
      </mesh>

      <GlassWall position={[0, 0, -d / 2]} length={w} hasDoorGap={zone.doorSides.includes('north')} />
      <GlassWall position={[0, 0, d / 2]} length={w} hasDoorGap={zone.doorSides.includes('south')} />
      <GlassWall
        position={[-w / 2, 0, 0]}
        length={d}
        rotationY={Math.PI / 2}
        hasDoorGap={zone.doorSides.includes('west')}
      />
      <GlassWall
        position={[w / 2, 0, 0]}
        length={d}
        rotationY={Math.PI / 2}
        hasDoorGap={zone.doorSides.includes('east')}
      />

      {[
        [-w / 2, -d / 2],
        [w / 2, -d / 2],
        [-w / 2, d / 2],
        [w / 2, d / 2],
      ].map(([px, pz], i) => (
        <mesh key={i} position={[px, 1.1, pz]} castShadow>
          <boxGeometry args={[0.13, 2.2, 0.13]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      <Html position={[0, 2.55, -d / 2 + 0.15]} center distanceFactor={28} zIndexRange={[5, 0]}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            focusZone(zone.id);
          }}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold tracking-tight text-slate-700 shadow-sm ring-1 ring-slate-200/90 transition hover:scale-105 hover:ring-blue-400 whitespace-nowrap cursor-pointer"
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: zone.accentColor }}
          />
          {zone.shortLabel}
        </button>
      </Html>
    </group>
  );
}

function InteractiveChair({
  spot,
  color = '#059669',
}: {
  spot: ActivitySpot;
  color?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const goToActivitySpot = useLibraryStore((s) => s.goToActivitySpot);

  return (
    <group
      position={[spot.seatPos[0], 0, spot.seatPos[1]]}
      rotation={[0, spot.facingY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        goToActivitySpot(spot);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHovered(false);
      }}
    >
      {/* Seat cushion */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.46, 0.1, 0.46]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.35 : 0}
        />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.65, -0.2]} castShadow>
        <boxGeometry args={[0.46, 0.46, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {/* Chair base leg */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.18, 0.34, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.5} />
      </mesh>

      {hovered && (
        <Html position={[0, 1.15, 0]} center distanceFactor={18} zIndexRange={[25, 0]}>
          <div className="pointer-events-none rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold text-white shadow whitespace-nowrap">
            🪑 {spot.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function InteractiveSofa({
  spotId,
  position,
  rotationY,
  color,
  backColor,
}: {
  spotId: string;
  position: [number, number, number];
  rotationY: number;
  color: string;
  backColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  const goToActivitySpot = useLibraryStore((s) => s.goToActivitySpot);
  const spot = getActivitySpotById(spotId);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (spot) goToActivitySpot(spot);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHovered(false);
      }}
    >
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[2.2, 0.44, 0.85]} />
        <meshStandardMaterial
          color={color}
          roughness={0.8}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.28 : 0}
        />
      </mesh>
      <mesh position={[0, 0.62, -0.32]} castShadow>
        <boxGeometry args={[2.2, 0.5, 0.22]} />
        <meshStandardMaterial color={backColor} roughness={0.8} />
      </mesh>
      {hovered && spot && (
        <Html position={[0, 1.25, 0]} center distanceFactor={20} zIndexRange={[25, 0]}>
          <div className="pointer-events-none rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold text-white shadow whitespace-nowrap">
            🛋️ {spot.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function CirculationDesk() {
  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const [dx, , dz] = CIRCULATION_DESK_POS;

  return (
    <group position={[dx, 0, dz]}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          setActiveDrawer('loans');
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 1.05, 1.25]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[4.4, 0.1, 1.4]} />
          <meshStandardMaterial color="#d97706" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.52, 0.64]}>
          <boxGeometry args={[3.2, 0.65, 0.04]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
        </mesh>

        {/* Holographic Borrow-Return Pad */}
        <mesh position={[0, 1.17, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.42, 24]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0, 1.16, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.25, 24]} />
          <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={0.45} />
        </mesh>

        {[-1.25, 1.25].map((mx, i) => (
          <group key={i} position={[mx, 1.15, -0.2]}>
            <mesh position={[0, 0.28, 0]} castShadow>
              <boxGeometry args={[0.72, 0.44, 0.06]} />
              <meshStandardMaterial color="#0f172a" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.28, 0.035]}>
              <planeGeometry args={[0.64, 0.36]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.16, 0.1, 0.18]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Interactive Lobby Sofas (world Z = 2.2 + 4.4 = 6.6) */}
      <InteractiveSofa
        spotId="lobby_sofa_l"
        position={[-2.9, 0, 4.4]}
        rotationY={Math.PI / 2}
        color="#3b82f6"
        backColor="#2563eb"
      />
      <InteractiveSofa
        spotId="lobby_sofa_r"
        position={[2.9, 0, 4.4]}
        rotationY={-Math.PI / 2}
        color="#f59e0b"
        backColor="#d97706"
      />
    </group>
  );
}

function ReadingFurniture() {
  const readingSpots = ACTIVITY_SPOTS.filter((s) => s.zone_id === 'diskusi');
  const adminSpot = getActivitySpotById('admin_workstation');

  return (
    <group>
      {/* 2 Meja Baca di Ruang Diskusi */}
      {[
        [8.4, 5.4],
        [11.4, 7.6],
      ].map(([tx, tz], idx) => (
        <group key={idx} position={[tx, 0, tz]}>
          <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.09, 1.35]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {[
            [-1.1, 0.34, -0.55],
            [1.1, 0.34, -0.55],
            [-1.1, 0.34, 0.55],
            [1.1, 0.34, 0.55],
          ].map((lp, li) => (
            <mesh key={li} position={lp as [number, number, number]}>
              <boxGeometry args={[0.08, 0.68, 0.08]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          ))}
          <mesh position={[0, 0.92, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.2, 0.16, 12]} />
            <meshStandardMaterial color="#10b981" emissive="#34d399" emissiveIntensity={0.45} />
          </mesh>
          {/* Open study book prop on table */}
          <mesh position={[-0.65, 0.75, 0.05]}>
            <boxGeometry args={[0.4, 0.04, 0.28]} />
            <meshStandardMaterial color="#fef9c3" />
          </mesh>
        </group>
      ))}

      {/* Kursi-kursi interaktif Ruang Baca */}
      {readingSpots.map((spot) => (
        <InteractiveChair key={spot.id} spot={spot} color="#059669" />
      ))}

      {/* Workstation Admin di Ruang Pustakawan */}
      <group position={[-9.8, 0, 7.8]}>
        <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.1, 1.3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[2.9, 0.64, 1.05]} />
          <meshStandardMaterial color="#f472b6" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.02, -0.2]} castShadow>
          <boxGeometry args={[1.1, 0.55, 0.06]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 1.02, -0.16]}>
          <planeGeometry args={[1.0, 0.46]} />
          <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={0.55} />
        </mesh>
      </group>

      {adminSpot && <InteractiveChair spot={adminSpot} color="#db2777" />}
    </group>
  );
}

export function LibraryBuilding() {
  const activeZone = useLibraryStore((s) => s.activeZone);
  const moveMyAvatarTo = useLibraryStore((s) => s.moveMyAvatarTo);

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { x, z } = e.point;
    moveMyAvatarTo(x, z, 'Berjalan di perpustakaan');
  };

  return (
    <group>
      <mesh position={[0, 0.005, 0]} receiveShadow onClick={handleFloorClick}>
        <boxGeometry args={[29.8, 0.03, 21.6]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
      </mesh>

      {/* Main Front Entrance Canopy */}
      <group position={[0, 0, 10.6]}>
        <mesh position={[0, 2.42, 0.35]} castShadow>
          <boxGeometry args={[4.4, 0.16, 1.5]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.03, 0.4]}>
          <boxGeometry args={[2.8, 0.03, 1.2]} />
          <meshStandardMaterial color="#2563eb" roughness={0.9} />
        </mesh>
        <Html position={[0, 2.75, 0.95]} center distanceFactor={26} zIndexRange={[5, 0]}>
          <div className="pointer-events-none rounded-lg bg-blue-900 px-2.5 py-0.5 text-[9px] font-extrabold tracking-widest text-white shadow">
            READIFY 3D
          </div>
        </Html>
      </group>

      {ZONE_LIST.map((zone) => (
        <ZoneRoom key={zone.id} zone={zone} isActive={activeZone === zone.id} />
      ))}

      <CirculationDesk />
      <ReadingFurniture />
    </group>
  );
}

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getShelfWorldPosition } from '../../data/zones';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { Book, Shelf } from '../../types/library';

function BookMesh({
  book,
  localPos,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  book: Book;
  localPos: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const outOfStock = book.available_copies <= 0;
  const bookHeight = 0.36 + ((book.id * 17) % 10) * 0.008;
  const bookWidth = 0.13;
  const bookDepth = 0.28;

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const targetZ = isSelected ? localPos[2] + 0.34 : isHovered ? localPos[2] + 0.16 : localPos[2];
    const targetY = isSelected
      ? localPos[1] + 0.16 + Math.sin(clock.getElapsedTime() * 3.5) * 0.03
      : isHovered
        ? localPos[1] + 0.06
        : localPos[1];
    const targetRotY = isSelected ? Math.sin(clock.getElapsedTime() * 1.6) * 0.35 : 0;

    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetZ, Math.min(1, delta * 9));
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, Math.min(1, delta * 9));
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRotY, Math.min(1, delta * 8));
  });

  return (
    <group
      ref={ref}
      position={localPos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHover(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        onHover(false);
      }}
    >
      {/* Book Cover / Spine */}
      <mesh castShadow={!outOfStock}>
        <boxGeometry args={[bookWidth, bookHeight, bookDepth]} />
        <meshStandardMaterial
          color={book.cover_color}
          roughness={0.45}
          transparent={outOfStock}
          opacity={outOfStock ? 0.25 : 1}
          emissive={isSelected || isHovered ? book.cover_color : '#000000'}
          emissiveIntensity={isSelected ? 0.45 : isHovered ? 0.25 : 0}
        />
      </mesh>

      {/* Cream pages inset */}
      {!outOfStock && (
        <mesh position={[0, 0.01, -0.01]}>
          <boxGeometry args={[bookWidth - 0.03, bookHeight - 0.03, bookDepth - 0.03]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.9} />
        </mesh>
      )}

      {/* White spine label accent */}
      <mesh position={[0, bookHeight * 0.24, bookDepth / 2 + 0.003]}>
        <planeGeometry args={[bookWidth * 0.72, 0.06]} />
        <meshStandardMaterial color="#ffffff" opacity={outOfStock ? 0.3 : 0.9} transparent />
      </mesh>

      {/* Hover or Selected Tooltip */}
      {(isHovered || isSelected) && (
        <Html position={[0, bookHeight / 2 + 0.28, 0.1]} center distanceFactor={16} zIndexRange={[30, 0]}>
          <div className="pointer-events-none rounded-lg bg-slate-900/92 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-sm whitespace-nowrap">
            <div className="text-[11px] font-bold leading-tight">{book.title}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-slate-300">
              <span>{book.author}</span>
              <span>•</span>
              <span className={outOfStock ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {outOfStock ? 'Habis dipinjam' : `Stok ${book.available_copies}/${book.total_copies}`}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function Shelf3D({ shelf, books }: { shelf: Shelf; books: Book[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredShelf, setHoveredShelf] = useState(false);

  const selectedBookId = useLibraryStore((s) => s.selectedBookId);
  const hoveredBookId = useLibraryStore((s) => s.hoveredBookId);
  const selectBook = useLibraryStore((s) => s.selectBook);
  const setHoveredBook = useLibraryStore((s) => s.setHoveredBook);
  const focusShelf = useLibraryStore((s) => s.focusShelf);

  const worldPos = useMemo(() => getShelfWorldPosition(shelf), [shelf]);
  const radY = ((shelf.rotation_y || 0) * Math.PI) / 180;
  const scaleRef = useRef(shelf.isNew ? 0.05 : 1);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (scaleRef.current < 1) {
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1, Math.min(1, delta * 7));
      if (1 - scaleRef.current < 0.005) scaleRef.current = 1;
      groupRef.current.scale.setScalar(scaleRef.current);
    }
  });

  const shelfWidth = 1.95;
  const perTier = Math.ceil(shelf.capacity / 2);

  return (
    <group ref={groupRef} position={worldPos} rotation={[0, radY, 0]}>
      {/* Wooden Frame Side Panels */}
      <mesh
        position={[-shelfWidth / 2, 0.9, 0]}
        castShadow
        receiveShadow
        onPointerOver={() => setHoveredShelf(true)}
        onPointerOut={() => setHoveredShelf(false)}
        onClick={(e) => {
          e.stopPropagation();
          focusShelf(shelf.id);
        }}
      >
        <boxGeometry args={[0.09, 1.8, 0.56]} />
        <meshStandardMaterial color="#d4a373" roughness={0.7} />
      </mesh>
      <mesh
        position={[shelfWidth / 2, 0.9, 0]}
        castShadow
        receiveShadow
        onPointerOver={() => setHoveredShelf(true)}
        onPointerOut={() => setHoveredShelf(false)}
      >
        <boxGeometry args={[0.09, 1.8, 0.56]} />
        <meshStandardMaterial color="#d4a373" roughness={0.7} />
      </mesh>

      {/* Back Panel */}
      <mesh position={[0, 0.9, -0.25]} castShadow receiveShadow>
        <boxGeometry args={[shelfWidth, 1.8, 0.05]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>

      {/* Top Board + Color Accent Strip */}
      <mesh position={[0, 1.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelfWidth + 0.12, 0.08, 0.6]} />
        <meshStandardMaterial color="#c8935f" roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.84, 0.25]}>
        <boxGeometry args={[shelfWidth, 0.07, 0.09]} />
        <meshStandardMaterial color={shelf.accent_color} roughness={0.4} />
      </mesh>

      {/* Bottom & Middle Shelves */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelfWidth, 0.07, 0.54]} />
        <meshStandardMaterial color="#d4a373" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelfWidth, 0.07, 0.54]} />
        <meshStandardMaterial color="#d4a373" roughness={0.7} />
      </mesh>
      {/* Plinth Base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelfWidth - 0.06, 0.4, 0.48]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>

      {/* Books placed on exact slots */}
      {books.map((book) => {
        const tier = book.slot_index < perTier ? 0 : 1;
        const col = book.slot_index % perTier;
        const innerW = shelfWidth - 0.2;
        const spacing = innerW / Math.max(1, perTier);
        const lx = -innerW / 2 + spacing * (col + 0.5);
        const ly = tier === 0 ? 1.29 : 0.67;
        return (
          <BookMesh
            key={book.id}
            book={book}
            localPos={[lx, ly, 0.06]}
            isSelected={selectedBookId === book.id}
            isHovered={hoveredBookId === book.id}
            onSelect={() => selectBook(book.id)}
            onHover={(h) => setHoveredBook(h ? book.id : null)}
          />
        );
      })}

      {/* Floating Shelf Code Tag */}
      {hoveredShelf && (
        <Html position={[0, 2.15, 0]} center distanceFactor={20} zIndexRange={[15, 0]}>
          <div className="pointer-events-none rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow ring-1 ring-slate-200 whitespace-nowrap">
            {shelf.code} — {shelf.name} ({books.length}/{shelf.capacity})
          </div>
        </Html>
      )}
    </group>
  );
}

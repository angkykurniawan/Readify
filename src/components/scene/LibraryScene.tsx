import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { Avatar3D } from './Avatar3D';
import { CameraRig } from './CameraRig';
import { CampusEnvironment } from './CampusEnvironment';
import { FlyingBook3D } from './FlyingBook3D';
import { LibraryBuilding } from './LibraryBuilding';
import { Shelf3D } from './Shelf3D';

function SceneContent() {
  const shelves = useLibraryStore((s) => s.shelves);
  const books = useLibraryStore((s) => s.books);
  const onlineUsers = useLibraryStore((s) => s.onlineUsers);
  const sessionToken = useLibraryStore((s) => s.sessionToken);
  const flyingBooks = useLibraryStore((s) => s.flyingBooks);

  const booksByShelf = useMemo(() => {
    const map = new Map<number, typeof books>();
    for (const b of books) {
      const arr = map.get(b.shelf_id) || [];
      arr.push(b);
      map.set(b.shelf_id, arr);
    }
    return map;
  }, [books]);

  return (
    <>
      <color attach="background" args={['#eef1f5']} />
      <fog attach="fog" args={['#eef1f5', 56, 120]} />

      {/* Clean bright architectural lighting matching isometric diorama reference */}
      <ambientLight intensity={0.78} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.55]} />
      <directionalLight
        position={[24, 34, 20]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={5}
        shadow-camera-far={90}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-18, 18, -14]} intensity={0.35} color="#e0f2fe" />

      <CampusEnvironment />
      <LibraryBuilding />

      {/* Dynamic 3D Bookshelves + Books */}
      {shelves.map((shelf) => (
        <Shelf3D key={shelf.id} shelf={shelf} books={booksByShelf.get(shelf.id) || []} />
      ))}

      {/* Realtime Online Avatars (Max 10) */}
      {onlineUsers.map((u) => (
        <Avatar3D key={u.session_token} user={u} isSelf={u.session_token === sessionToken} />
      ))}

      {/* Active Borrow / Return Flying Book Animations */}
      {flyingBooks.map((anim) => (
        <FlyingBook3D key={anim.id} anim={anim} />
      ))}

      <CameraRig />
    </>
  );
}

export function LibraryScene() {
  return (
    <div className="fixed inset-0 h-screen w-screen">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [24, 24, 26], fov: 30, near: 0.5, far: 180 }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

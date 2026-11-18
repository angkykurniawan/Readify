import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { liveAvatarPos } from '../../data/collision';
import { useLibraryStore } from '../../store/useLibraryStore';

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const cameraGoal = useLibraryStore((s) => s.cameraGoal);
  const cameraMode = useLibraryStore((s) => s.cameraMode);

  const isTransitioning = useRef(true);
  const goalPosVec = useRef(new THREE.Vector3(...cameraGoal.pos));
  const goalTargetVec = useRef(new THREE.Vector3(...cameraGoal.target));
  const walkTargetVec = useRef(new THREE.Vector3());
  const walkPosVec = useRef(new THREE.Vector3());

  useEffect(() => {
    goalPosVec.current.set(...cameraGoal.pos);
    goalTargetVec.current.set(...cameraGoal.target);
    isTransitioning.current = true;
  }, [cameraGoal]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(delta, 0.05);

    if (cameraMode === 'walk') {
      // Membaca liveAvatarPos langsung tanpa alokasi objek baru & tanpa React re-render
      walkTargetVec.current.set(liveAvatarPos.x, 0.9, liveAvatarPos.z);
      walkPosVec.current.set(liveAvatarPos.x + 6.5, 7.4, liveAvatarPos.z + 8.0);
      camera.position.lerp(walkPosVec.current, Math.min(1, dt * 5.0));
      controls.target.lerp(walkTargetVec.current, Math.min(1, dt * 6.5));
      controls.update();
      return;
    }

    if (isTransitioning.current) {
      camera.position.lerp(goalPosVec.current, Math.min(1, dt * 5.2));
      controls.target.lerp(goalTargetVec.current, Math.min(1, dt * 5.6));
      if (
        camera.position.distanceTo(goalPosVec.current) < 0.08 &&
        controls.target.distanceTo(goalTargetVec.current) < 0.08
      ) {
        isTransitioning.current = false;
      }
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={56}
      minPolarAngle={0.28}
      maxPolarAngle={Math.PI / 2.25}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
      }}
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
}

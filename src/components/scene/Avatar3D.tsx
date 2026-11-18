import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getActivitySpotById } from '../../data/activities';
import { buildLibraryColliders, liveAvatarPos, resolveMovement } from '../../data/collision';
import { ENTRANCE_DOOR_POS, ENTRANCE_OUTSIDE_POS } from '../../data/zones';
import { isMovementLocked, useLibraryStore } from '../../store/useLibraryStore';
import type { AvatarActivity, OnlineUser } from '../../types/library';

export function Avatar3D({ user, isSelf }: { user: OnlineUser; isSelf: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const heldBookRef = useRef<THREE.Group>(null);

  const posRef = useRef<[number, number]>(
    user.isJoining ? [ENTRANCE_OUTSIDE_POS[0], ENTRANCE_OUTSIDE_POS[1]] : [user.pos_x, user.pos_z]
  );
  const doorPassedRef = useRef(!user.isJoining);
  const keysRef = useRef<Record<string, boolean>>({});
  const pathIndexRef = useRef(0);
  const lastPathRef = useRef<Array<[number, number]>>([]);
  const stuckFramesRef = useRef(0);
  const lastStoreSyncPosRef = useRef<[number, number]>([posRef.current[0], posRef.current[1]]);
  const lastStoreSyncTimeRef = useRef(0);

  const shelves = useLibraryStore((s) => s.shelves);
  const myPath = useLibraryStore((s) => s.myPath);
  const myActivity = useLibraryStore((s) => s.myActivity);
  const mySeatId = useLibraryStore((s) => s.mySeatId);
  const pendingSeatId = useLibraryStore((s) => s.pendingSeatId);
  const selectedBookId = useLibraryStore((s) => s.selectedBookId);
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const myStatusText = useLibraryStore((s) => s.myStatusText);
  const virtualMove = useLibraryStore((s) => s.virtualMove);
  const updateMyPosImmediate = useLibraryStore((s) => s.updateMyPosImmediate);
  const completeArrivalAtSpot = useLibraryStore((s) => s.completeArrivalAtSpot);

  const colliders = useMemo(() => buildLibraryColliders(shelves), [shelves]);

  // Sinkronkan posisi awal saat berdiri kembali dari kursi
  useEffect(() => {
    if (!isSelf) return;
    if (!mySeatId && myPath.length === 0) {
      posRef.current = [liveAvatarPos.x, liveAvatarPos.z];
    }
  }, [isSelf, mySeatId, myPath.length]);

  useEffect(() => {
    if (!isSelf) return;
    if (lastPathRef.current !== myPath) {
      lastPathRef.current = myPath;
      pathIndexRef.current = 0;
      stuckFramesRef.current = 0;
    }
  }, [isSelf, myPath]);

  useEffect(() => {
    if (!isSelf) return;
    const onDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [isSelf]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    let [cx, cz] = posRef.current;
    let moving = false;

    const currentActivity: AvatarActivity = isSelf ? myActivity : user.activity || 'idle';
    const currentSeatId = isSelf ? mySeatId : user.seat_id;
    const seatSpot = getActivitySpotById(currentSeatId);

    const lockedByActivity =
      isSelf &&
      isMovementLocked({
        myActivity,
        mySeatId,
        selectedBookId,
        activeDrawer,
      });

    // 1. Cek input WASD / Arrow Keys / Mobile D-Pad (HANYA jika tidak sedang beraktivitas!)
    let keyDx = isSelf && !lockedByActivity ? virtualMove.dx : 0;
    let keyDz = isSelf && !lockedByActivity ? virtualMove.dz : 0;
    if (isSelf && !lockedByActivity) {
      const k = keysRef.current;
      if (k['w'] || k['arrowup']) keyDz -= 1;
      if (k['s'] || k['arrowdown']) keyDz += 1;
      if (k['a'] || k['arrowleft']) keyDx -= 1;
      if (k['d'] || k['arrowright']) keyDx += 1;
    }

    if (isSelf && !lockedByActivity && (keyDx !== 0 || keyDz !== 0)) {
      doorPassedRef.current = true;
      const len = Math.hypot(keyDx, keyDz) || 1;
      const speed = 5.2;
      const desiredX = cx + (keyDx / len) * speed * dt;
      const desiredZ = cz + (keyDz / len) * speed * dt;

      // Smooth 2-pass Circle-AABB Push-Out: bebas lag & bebas tembus objek!
      const [rx, rz] = resolveMovement(cx, cz, desiredX, desiredZ, colliders, 0.34);
      const movedDist = Math.hypot(rx - cx, rz - cz);
      if (movedDist > 0.003) {
        const yaw = Math.atan2(rx - cx, rz - cz);
        groupRef.current.rotation.y = yaw;
        cx = rx;
        cz = rz;
        moving = true;
      }
      if (myPath.length > 0) {
        updateMyPosImmediate(cx, cz, true);
      }
    } else if (isSelf) {
      if (lockedByActivity) {
        // Terkunci penuh selama melakukan aktivitas (duduk, membaca buku, meja sirkulasi)
        if (seatSpot) {
          cx = THREE.MathUtils.lerp(cx, seatSpot.seatPos[0], Math.min(1, dt * 10));
          cz = THREE.MathUtils.lerp(cz, seatSpot.seatPos[1], Math.min(1, dt * 10));
          groupRef.current.rotation.y = seatSpot.facingY;
        }
      } else if (!doorPassedRef.current) {
        const distDoor = Math.hypot(ENTRANCE_DOOR_POS[0] - cx, ENTRANCE_DOOR_POS[1] - cz);
        if (distDoor < 0.4) {
          doorPassedRef.current = true;
        } else {
          const step = Math.min(distDoor, 4.4 * dt);
          cx += ((ENTRANCE_DOOR_POS[0] - cx) / distDoor) * step;
          cz += ((ENTRANCE_DOOR_POS[1] - cz) / distDoor) * step;
          groupRef.current.rotation.y = Math.atan2(
            ENTRANCE_DOOR_POS[0] - cx,
            ENTRANCE_DOOR_POS[1] - cz
          );
          moving = true;
        }
      } else if (myPath.length > 0 && pathIndexRef.current < myPath.length) {
        const wp = myPath[pathIndexRef.current];
        const dx = wp[0] - cx;
        const dz = wp[1] - cz;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.18) {
          cx = wp[0];
          cz = wp[1];
          stuckFramesRef.current = 0;
          pathIndexRef.current += 1;
          if (pathIndexRef.current >= myPath.length) {
            if (pendingSeatId) {
              completeArrivalAtSpot(pendingSeatId);
            } else {
              updateMyPosImmediate(cx, cz, true);
            }
          }
        } else {
          const step = Math.min(dist, 4.1 * dt);
          const nextX = cx + (dx / dist) * step;
          const nextZ = cz + (dz / dist) * step;
          const [rx, rz] = resolveMovement(cx, cz, nextX, nextZ, colliders, 0.3);
          const moved = Math.hypot(rx - cx, rz - cz);
          if (moved < 0.002) {
            stuckFramesRef.current += 1;
            // Hentikan jalur secara halus jika terhalang agar tidak pernah jitter/lag
            if (stuckFramesRef.current > 8) {
              stuckFramesRef.current = 0;
              updateMyPosImmediate(cx, cz, true);
            }
          } else {
            stuckFramesRef.current = 0;
            cx = rx;
            cz = rz;
            groupRef.current.rotation.y = Math.atan2(dx, dz);
            moving = true;
          }
        }
      }
    } else {
      // Interpolasi halus untuk pengunjung online lainnya
      let targetX = seatSpot ? seatSpot.seatPos[0] : user.pos_x;
      let targetZ = seatSpot ? seatSpot.seatPos[1] : user.pos_z;

      if (!doorPassedRef.current) {
        const distDoor = Math.hypot(ENTRANCE_DOOR_POS[0] - cx, ENTRANCE_DOOR_POS[1] - cz);
        if (distDoor < 0.45) {
          doorPassedRef.current = true;
        } else {
          targetX = ENTRANCE_DOOR_POS[0];
          targetZ = ENTRANCE_DOOR_POS[1];
        }
      }

      const dx = targetX - cx;
      const dz = targetZ - cz;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.08) {
        const step = Math.min(dist, 4.0 * dt);
        cx += (dx / dist) * step;
        cz += (dz / dist) * step;
        groupRef.current.rotation.y = Math.atan2(dx, dz);
        moving = true;
      } else if (seatSpot) {
        groupRef.current.rotation.y = seatSpot.facingY;
      }
    }

    posRef.current[0] = cx;
    posRef.current[1] = cz;
    if (isSelf) {
      liveAvatarPos.x = cx;
      liveAvatarPos.z = cz;
    }

    const t = clock.getElapsedTime();

    const isSitting =
      !moving &&
      (currentActivity === 'sitting_read' ||
        currentActivity === 'sitting_lounge' ||
        currentActivity === 'sitting_work');

    const isHoldingBook =
      !moving &&
      (currentActivity === 'sitting_read' ||
        currentActivity === 'reading_stand' ||
        (isSelf && (selectedBookId !== null || activeDrawer === 'book')));

    const seatDrop = isSitting ? -0.18 : 0;
    const bob = moving
      ? Math.abs(Math.sin(t * 11)) * 0.08
      : isSitting
        ? 0
        : Math.sin(t * 2.2 + user.user_id) * 0.015;
    groupRef.current.position.set(cx, bob + seatDrop, cz);

    if (bodyRef.current) {
      const targetLean =
        currentActivity === 'sitting_lounge'
          ? -0.12
          : currentActivity === 'sitting_read' || currentActivity === 'sitting_work'
            ? 0.08
            : 0;
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, targetLean, dt * 8);
    }

    if (headRef.current) {
      const headPitch = isHoldingBook
        ? 0.28 + Math.sin(t * 1.8) * 0.05
        : currentActivity === 'sitting_work'
          ? 0.1 + Math.sin(t * 3) * 0.04
          : 0;
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headPitch, dt * 8);
    }

    const legSwing = moving ? Math.sin(t * 11) * 0.65 : 0;
    const leftLegTarget = isSitting ? -Math.PI / 2.1 : legSwing;
    const rightLegTarget = isSitting ? -Math.PI / 2.1 : -legSwing;
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, leftLegTarget, dt * 10);
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, rightLegTarget, dt * 10);
    }

    let leftArmTarget = moving ? -legSwing * 0.85 : 0;
    let rightArmTarget = moving ? legSwing * 0.85 : 0;

    if (isHoldingBook) {
      leftArmTarget = -0.95;
      rightArmTarget = -0.95;
    } else if (currentActivity === 'sitting_work' && !moving) {
      leftArmTarget = -0.85 + Math.sin(t * 12) * 0.12;
      rightArmTarget = -0.85 - Math.sin(t * 12) * 0.12;
    } else if (currentActivity === 'sitting_lounge' && !moving) {
      leftArmTarget = -0.35;
      rightArmTarget = -0.35;
    } else if (currentActivity === 'circulating' && !moving) {
      rightArmTarget = -0.6 + Math.sin(t * 4) * 0.18;
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, leftArmTarget, dt * 10);
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, rightArmTarget, dt * 10);
    }

    if (heldBookRef.current) {
      heldBookRef.current.visible = isHoldingBook;
    }

    // Sync ke Zustand hanya saat benar-benar berpindah jauh (menghindari re-render React saat menabrak dinding!)
    if (isSelf && t - lastStoreSyncTimeRef.current > 0.45) {
      const movedSinceSync = Math.hypot(
        cx - lastStoreSyncPosRef.current[0],
        cz - lastStoreSyncPosRef.current[1]
      );
      if (movedSinceSync > 0.18) {
        lastStoreSyncTimeRef.current = t;
        lastStoreSyncPosRef.current[0] = cx;
        lastStoreSyncPosRef.current[1] = cz;
        updateMyPosImmediate(cx, cz, false);
      }
    }
  });

  const statusLabel = isSelf ? myStatusText : user.status_text;

  return (
    <group ref={groupRef} position={[posRef.current[0], 0, posRef.current[1]]}>
      {isSelf && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.44, 24]} />
          <meshStandardMaterial color="#2563eb" emissive="#3b82f6" emissiveIntensity={0.8} />
        </mesh>
      )}

      <group ref={leftLegRef} position={[-0.1, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.13, 0.42, 0.14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.1, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.13, 0.42, 0.14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </group>

      <group ref={bodyRef} position={[0, 0.44, 0]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[0.38, 0.46, 0.24]} />
          <meshStandardMaterial color={user.avatar_color} roughness={0.5} />
        </mesh>

        <group ref={leftArmRef} position={[-0.25, 0.4, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <boxGeometry args={[0.11, 0.38, 0.12]} />
            <meshStandardMaterial color={user.avatar_color} roughness={0.55} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.25, 0.4, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <boxGeometry args={[0.11, 0.38, 0.12]} />
            <meshStandardMaterial color={user.avatar_color} roughness={0.55} />
          </mesh>
        </group>

        <group ref={heldBookRef} position={[0, 0.26, 0.34]} rotation={[-0.45, 0, 0]} visible={false}>
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.2, 0.025, 0.26]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.2, 0.025, 0.26]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <boxGeometry args={[0.34, 0.018, 0.23]} />
            <meshStandardMaterial color="#fef9c3" />
          </mesh>
        </group>

        <group ref={headRef} position={[0, 0.62, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshStandardMaterial color="#fde6d2" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.09, -0.02]} castShadow>
            <sphereGeometry args={[0.205, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color={user.role === 'admin' ? '#831843' : '#1e293b'} roughness={0.75} />
          </mesh>
        </group>
      </group>

      <Html position={[0, 1.66, 0]} center distanceFactor={24} zIndexRange={[20, 0]}>
        <div className="pointer-events-none flex flex-col items-center">
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm whitespace-nowrap ${
              isSelf
                ? 'bg-blue-600 text-white ring-2 ring-white'
                : 'bg-white/95 text-slate-800 ring-1 ring-slate-200'
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: isSelf ? '#93c5fd' : user.avatar_color }}
            />
            <span>{user.user_name}</span>
            {user.role === 'admin' && (
              <span className="rounded bg-pink-100 px-1 text-[8px] font-extrabold text-pink-700">
                ADMIN
              </span>
            )}
          </div>
          {statusLabel && (
            <div className="mt-0.5 rounded-full bg-slate-900/75 px-2 py-0.5 text-[8.5px] font-medium text-white backdrop-blur-xs whitespace-nowrap max-w-[165px] truncate">
              {statusLabel}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

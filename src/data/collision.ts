import type { Shelf } from '../types/library';
import { ZONE_LIST, getShelfWorldPosition } from './zones';

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const WALL_THICKNESS = 0.22;
const DOOR_GAP = 2.4;

function makeBox(cx: number, cz: number, w: number, d: number): AABB {
  return {
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minZ: cz - d / 2,
    maxZ: cz + d / 2,
  };
}

function addWallSegments(
  list: AABB[],
  cx: number,
  cz: number,
  length: number,
  horizontal: boolean,
  hasDoorGap: boolean
) {
  if (hasDoorGap && length > DOOR_GAP + 0.8) {
    const segLen = (length - DOOR_GAP) / 2;
    const offset = segLen / 2 + DOOR_GAP / 2;
    if (horizontal) {
      list.push(makeBox(cx - offset, cz, segLen, WALL_THICKNESS));
      list.push(makeBox(cx + offset, cz, segLen, WALL_THICKNESS));
    } else {
      list.push(makeBox(cx, cz - offset, WALL_THICKNESS, segLen));
      list.push(makeBox(cx, cz + offset, WALL_THICKNESS, segLen));
    }
  } else if (horizontal) {
    list.push(makeBox(cx, cz, length, WALL_THICKNESS));
  } else {
    list.push(makeBox(cx, cz, WALL_THICKNESS, length));
  }
}

/**
 * Menghasilkan seluruh collider 3D (dinding kaca, furnitur, dan seluruh rak buku dinamis)
 */
export function buildLibraryColliders(shelves: Shelf[]): AABB[] {
  const colliders: AABB[] = [];

  // 1. Dinding kaca tiap zona (membuka celah pintu pada sisi koridor)
  for (const zone of ZONE_LIST) {
    const [cx, cz] = zone.center;
    const [w, d] = zone.size;
    addWallSegments(colliders, cx, cz - d / 2, w, true, zone.doorSides.includes('north'));
    addWallSegments(colliders, cx, cz + d / 2, w, true, zone.doorSides.includes('south'));
    addWallSegments(colliders, cx - w / 2, cz, d, false, zone.doorSides.includes('west'));
    addWallSegments(colliders, cx + w / 2, cz, d, false, zone.doorSides.includes('east'));
  }

  // 2. Furnitur tetap: Meja Sirkulasi di Lobby [0, 2.2]
  colliders.push(makeBox(0, 2.2, 4.4, 1.45));

  // Sofa kiri & kanan Lobby (center [±2.9, 6.6], ukuran 0.85 x 2.2 karena rotasi 90°)
  colliders.push(makeBox(-2.9, 6.6, 0.9, 2.25));
  colliders.push(makeBox(2.9, 6.6, 0.9, 2.25));

  // 2 Meja Baca di Ruang Diskusi ([8.4, 5.4] dan [11.4, 7.6], ukuran 2.5 x 1.35)
  colliders.push(makeBox(8.4, 5.4, 2.55, 1.4));
  colliders.push(makeBox(11.4, 7.6, 2.55, 1.4));

  // Meja Pustakawan di Ruang Admin ([-9.8, 7.8], ukuran 3.2 x 1.3)
  colliders.push(makeBox(-9.8, 7.8, 3.25, 1.35));

  // 3. Semua Rak Buku 3D dinamis (termasuk rak baru buatan Admin)
  for (const shelf of shelves) {
    const [sx, , sz] = getShelfWorldPosition(shelf);
    const isRotated = Math.abs((shelf.rotation_y || 0) % 180) === 90;
    const w = isRotated ? 0.68 : 2.08;
    const d = isRotated ? 2.08 : 0.68;
    colliders.push(makeBox(sx, sz, w, d));
  }

  return colliders;
}

export function isPointColliding(x: number, z: number, colliders: AABB[], radius = 0.34): boolean {
  // Batas luar gedung perpustakaan (kecuali koridor pintu masuk selatan x in [-1.1, 1.1])
  if (x < -14.2 || x > 14.2 || z < -10.0) return true;
  if (z > 9.5 && Math.abs(x) > 1.05) return true;
  if (z > 14.8) return true;

  for (let i = 0; i < colliders.length; i++) {
    const b = colliders[i];
    const nearestX = Math.max(b.minX, Math.min(x, b.maxX));
    const nearestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    if (dx * dx + dz * dz < radius * radius) {
      return true;
    }
  }
  return false;
}

/**
 * Ref posisi avatar lokal berkecepatan tinggi (dibaca CameraRig di 60fps tanpa memicu re-render React)
 */
export const liveAvatarPos = { x: 0, z: 14.2 };

/**
 * Menyelesaikan tabrakan dengan Circle-vs-AABB Push-Out (2 pass) agar meluncur mulus
 * di sepanjang dinding/rak/meja tanpa nyangkut, tanpa jitter, dan tanpa lag!
 */
export function resolveMovement(
  currX: number,
  currZ: number,
  nextX: number,
  nextZ: number,
  colliders: AABB[],
  radius = 0.34
): [number, number] {
  let x = nextX;
  let z = nextZ;

  // Batas luar gedung perpustakaan
  if (x < -14.15) x = -14.15;
  if (x > 14.15) x = 14.15;
  if (z < -9.95) z = -9.95;
  if (z > 9.45 && Math.abs(x) > 1.0) z = 9.45;
  if (z > 14.7) z = 14.7;

  const rSq = radius * radius;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const nearestX = x < b.minX ? b.minX : x > b.maxX ? b.maxX : x;
      const nearestZ = z < b.minZ ? b.minZ : z > b.maxZ ? b.maxZ : z;
      const dx = x - nearestX;
      const dz = z - nearestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < rSq) {
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist + 0.002;
          x += (dx / dist) * overlap;
          z += (dz / dist) * overlap;
        } else {
          // Pusat lingkaran di dalam kotak: dorong keluar lewat sisi terdekat
          const penLeft = Math.abs(x - b.minX);
          const penRight = Math.abs(b.maxX - x);
          const penTop = Math.abs(z - b.minZ);
          const penBottom = Math.abs(b.maxZ - z);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) x = b.minX - radius - 0.002;
          else if (minPen === penRight) x = b.maxX + radius + 0.002;
          else if (minPen === penTop) z = b.minZ - radius - 0.002;
          else z = b.maxZ + radius + 0.002;
        }
      }
    }
  }

  // Fallback pengaman jika masih menyentuh sudut sempit
  if (isPointColliding(x, z, colliders, radius * 0.92)) {
    return [currX, currZ];
  }

  return [x, z];
}

// ============================================================================
// 2D A* PATHFINDING RINGAN (Menghindari Rak, Meja, dan Melewati Celah Pintu)
// ============================================================================

const GRID_STEP = 0.5;
const MIN_X = -14.5;
const MAX_X = 14.5;
const MIN_Z = -10.5;
const MAX_Z = 10.5;
const COLS = Math.round((MAX_X - MIN_X) / GRID_STEP) + 1;
const ROWS = Math.round((MAX_Z - MIN_Z) / GRID_STEP) + 1;

function worldToGrid(x: number, z: number): [number, number] {
  const gx = Math.max(0, Math.min(COLS - 1, Math.round((x - MIN_X) / GRID_STEP)));
  const gz = Math.max(0, Math.min(ROWS - 1, Math.round((z - MIN_Z) / GRID_STEP)));
  return [gx, gz];
}

function gridToWorld(gx: number, gz: number): [number, number] {
  return [MIN_X + gx * GRID_STEP, MIN_Z + gz * GRID_STEP];
}

function findNearestWalkable(gx: number, gz: number, colliders: AABB[]): [number, number] {
  const [wx0, wz0] = gridToWorld(gx, gz);
  if (!isPointColliding(wx0, wz0, colliders, 0.32)) return [gx, gz];

  for (let r = 1; r <= 6; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const nx = gx + dx;
        const nz = gz + dz;
        if (nx < 0 || nx >= COLS || nz < 0 || nz >= ROWS) continue;
        const [wx, wz] = gridToWorld(nx, nz);
        if (!isPointColliding(wx, wz, colliders, 0.32)) {
          return [nx, nz];
        }
      }
    }
  }
  return [gx, gz];
}

export function findPath(
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
  colliders: AABB[]
): Array<[number, number]> {
  const [sgx0, sgz0] = worldToGrid(startX, startZ);
  const [ggx0, ggz0] = worldToGrid(goalX, goalZ);
  const [sgx, sgz] = findNearestWalkable(sgx0, sgz0, colliders);
  const [ggx, ggz] = findNearestWalkable(ggx0, ggz0, colliders);

  const key = (x: number, z: number) => z * COLS + x;
  const startKey = key(sgx, sgz);
  const goalKey = key(ggx, ggz);

  if (startKey === goalKey) {
    return [gridToWorld(ggx, ggz)];
  }

  const total = COLS * ROWS;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const blocked = new Int8Array(total); // 0=unknown, 1=walkable, -1=blocked

  const isCellBlocked = (cx: number, cz: number): boolean => {
    const idx = key(cx, cz);
    if (blocked[idx] !== 0) return blocked[idx] === -1;
    const [wx, wz] = gridToWorld(cx, cz);
    const hit = isPointColliding(wx, wz, colliders, 0.32);
    blocked[idx] = hit ? -1 : 1;
    return hit;
  };

  gScore[startKey] = 0;
  fScore[startKey] = Math.hypot(ggx - sgx, ggz - sgz);

  const open: number[] = [startKey];
  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [-1, 1, 1.414],
    [1, -1, 1.414],
    [-1, -1, 1.414],
  ];

  let found = false;
  let iterations = 0;

  while (open.length > 0 && iterations < 2200) {
    iterations++;
    // Ambil node dengan fScore terendah
    let bestIdx = 0;
    let bestF = fScore[open[0]];
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < bestF) {
        bestF = fScore[open[i]];
        bestIdx = i;
      }
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    if (current === goalKey) {
      found = true;
      break;
    }
    if (closed[current]) continue;
    closed[current] = 1;

    const cx = current % COLS;
    const cz = Math.floor(current / COLS);

    for (let d = 0; d < dirs.length; d++) {
      const nx = cx + dirs[d][0];
      const nz = cz + dirs[d][1];
      if (nx < 0 || nx >= COLS || nz < 0 || nz >= ROWS) continue;
      const nKey = key(nx, nz);
      if (closed[nKey]) continue;
      if (nKey !== goalKey && isCellBlocked(nx, nz)) continue;

      // Cegah diagonal memotong sudut dinding/rak
      if (dirs[d][0] !== 0 && dirs[d][1] !== 0) {
        if (isCellBlocked(cx + dirs[d][0], cz) || isCellBlocked(cx, cz + dirs[d][1])) {
          continue;
        }
      }

      const tentativeG = gScore[current] + dirs[d][2];
      if (tentativeG < gScore[nKey]) {
        cameFrom[nKey] = current;
        gScore[nKey] = tentativeG;
        fScore[nKey] = tentativeG + Math.hypot(ggx - nx, ggz - nz);
        if (!open.includes(nKey)) {
          open.push(nKey);
        }
      }
    }
  }

  if (!found) {
    return [];
  }

  // Rekonstruksi jalur lalu sederhanakan titik segaris
  const raw: Array<[number, number]> = [];
  let cur = goalKey;
  while (cur !== -1 && cur !== startKey) {
    const gx = cur % COLS;
    const gz = Math.floor(cur / COLS);
    raw.push(gridToWorld(gx, gz));
    cur = cameFrom[cur];
  }
  raw.reverse();

  // Simplifikasi collinear waypoints agar gerakan sangat mulus
  if (raw.length <= 2) return raw;
  const simplified: Array<[number, number]> = [raw[0]];
  for (let i = 1; i < raw.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = raw[i];
    const next = raw[i + 1];
    const dx1 = Math.sign(curr[0] - prev[0]);
    const dz1 = Math.sign(curr[1] - prev[1]);
    const dx2 = Math.sign(next[0] - curr[0]);
    const dz2 = Math.sign(next[1] - curr[1]);
    if (dx1 !== dx2 || dz1 !== dz2) {
      simplified.push(curr);
    }
  }
  simplified.push(raw[raw.length - 1]);
  return simplified;
}

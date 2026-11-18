import type { Shelf, ZoneId } from '../types/library';

export interface ZoneDefinition {
  id: ZoneId;
  label: string;
  shortLabel: string;
  floorColor: string;
  accentColor: string;
  center: [number, number]; // [x, z]
  size: [number, number]; // [width, depth]
  gridCols: number;
  gridRows: number;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  doorSides: Array<'south' | 'north' | 'east' | 'west'>;
}

export const CIRCULATION_DESK_POS: [number, number, number] = [0, 1.35, 2.2];
export const ENTRANCE_OUTSIDE_POS: [number, number] = [0, 14.2];
export const ENTRANCE_DOOR_POS: [number, number] = [0, 9.8];

export const EAGLE_EYE_CAMERA: {
  pos: [number, number, number];
  target: [number, number, number];
} = {
  pos: [24, 24, 26],
  target: [0, 0, 0.5],
};

export const ZONES: Record<ZoneId, ZoneDefinition> = {
  lobby: {
    id: 'lobby',
    label: 'Lobby & Meja Sirkulasi',
    shortLabel: 'Meja Sirkulasi',
    floorColor: '#fef3c7',
    accentColor: '#f59e0b',
    center: [0, 4.1],
    size: [9.0, 11.4],
    gridCols: 2,
    gridRows: 2,
    cameraPos: [10, 12.5, 16],
    cameraTarget: [0, 0.6, 3.2],
    doorSides: ['south', 'north', 'east', 'west'],
  },
  fiksi: {
    id: 'fiksi',
    label: 'Zona Fiksi & Sastra',
    shortLabel: 'Fiksi & Sastra',
    floorColor: '#dbeafe',
    accentColor: '#3b82f6',
    center: [-9.8, -6.4],
    size: [9.2, 7.8],
    gridCols: 3,
    gridRows: 2,
    cameraPos: [-2, 12.5, 5],
    cameraTarget: [-9.8, 0.8, -6.4],
    doorSides: ['east', 'south'],
  },
  sains: {
    id: 'sains',
    label: 'Zona Sains & Teknologi',
    shortLabel: 'Sains & Tech',
    floorColor: '#ccfbf1',
    accentColor: '#0ea5e9',
    center: [0, -6.4],
    size: [9.0, 7.8],
    gridCols: 3,
    gridRows: 2,
    cameraPos: [9, 12.5, 5],
    cameraTarget: [0, 0.8, -6.4],
    doorSides: ['south', 'west', 'east'],
  },
  bisnis: {
    id: 'bisnis',
    label: 'Zona Bisnis & Karir',
    shortLabel: 'Bisnis & Karir',
    floorColor: '#ffedd5',
    accentColor: '#f97316',
    center: [9.8, -6.4],
    size: [9.2, 7.8],
    gridCols: 3,
    gridRows: 2,
    cameraPos: [19, 12.5, 5],
    cameraTarget: [9.8, 0.8, -6.4],
    doorSides: ['west', 'south'],
  },
  sejarah: {
    id: 'sejarah',
    label: 'Zona Sejarah & Budaya',
    shortLabel: 'Sejarah',
    floorColor: '#ede9fe',
    accentColor: '#8b5cf6',
    center: [-9.8, 1.3],
    size: [9.2, 5.8],
    gridCols: 3,
    gridRows: 2,
    cameraPos: [-1, 11.5, 11],
    cameraTarget: [-9.8, 0.8, 1.3],
    doorSides: ['east', 'north'],
  },
  diskusi: {
    id: 'diskusi',
    label: 'Ruang Baca & Diskusi',
    shortLabel: 'Ruang Baca',
    floorColor: '#d1fae5',
    accentColor: '#10b981',
    center: [9.8, 4.1],
    size: [9.2, 11.4],
    gridCols: 3,
    gridRows: 2,
    cameraPos: [19, 13, 15],
    cameraTarget: [9.8, 0.8, 4.1],
    doorSides: ['west', 'north'],
  },
  admin: {
    id: 'admin',
    label: 'Ruang Pustakawan & Admin',
    shortLabel: 'Ruang Admin',
    floorColor: '#fce7f3',
    accentColor: '#ec4899',
    center: [-9.8, 7.3],
    size: [9.2, 5.0],
    gridCols: 2,
    gridRows: 1,
    cameraPos: [-1, 11, 16],
    cameraTarget: [-9.8, 0.8, 7.3],
    doorSides: ['east'],
  },
};

export const ZONE_LIST: ZoneDefinition[] = [
  ZONES.lobby,
  ZONES.fiksi,
  ZONES.sains,
  ZONES.bisnis,
  ZONES.sejarah,
  ZONES.diskusi,
  ZONES.admin,
];

/**
 * Menghitung posisi 3D deterministik rak di dalam zona berdasarkan (grid_x, grid_z)
 */
export function getShelfWorldPosition(shelf: Pick<Shelf, 'zone_id' | 'grid_x' | 'grid_z'>): [number, number, number] {
  const zone = ZONES[shelf.zone_id] ?? ZONES.fiksi;
  const [cx, cz] = zone.center;
  const [w, d] = zone.size;

  // Area khusus ruang diskusi (rak ditaruh di bagian utara ruangan agar tidak tabrakan dengan meja baca selatan)
  const effectiveDepth = shelf.zone_id === 'diskusi' ? d * 0.45 : d - 1.8;
  const zOffsetBase = shelf.zone_id === 'diskusi' ? -d * 0.24 : 0;

  // Area khusus lobby (rak ditaruh di sisi belakang/utara agar meja sirkulasi tetap lapang)
  const lobbyOffsetZ = shelf.zone_id === 'lobby' ? -3.4 : 0;

  const cols = Math.max(1, zone.gridCols);
  const rows = Math.max(1, zone.gridRows);

  const usableW = w - 2.2;
  const stepX = cols > 1 ? usableW / (cols - 1) : 0;
  const stepZ = rows > 1 ? effectiveDepth / (rows - 1) : 0;

  const gx = Math.max(0, Math.min(cols - 1, shelf.grid_x));
  const gz = Math.max(0, Math.min(rows - 1, shelf.grid_z));

  const wx = cx - usableW / 2 + gx * stepX;
  const wz =
    shelf.zone_id === 'lobby'
      ? cz + lobbyOffsetZ + gz * 1.4
      : cz + zOffsetBase - effectiveDepth / 2 + gz * stepZ;

  return [Number(wx.toFixed(2)), 0, Number(wz.toFixed(2))];
}

/**
 * Menghitung posisi dunia 3D tepat pada slot buku tertentu di sebuah rak
 */
export function getBookWorldPosition(
  shelf: Pick<Shelf, 'zone_id' | 'grid_x' | 'grid_z' | 'rotation_y' | 'capacity'>,
  slotIndex: number
): [number, number, number] {
  const [sx, , sz] = getShelfWorldPosition(shelf);
  const perTier = Math.ceil(shelf.capacity / 2);
  const tier = slotIndex < perTier ? 0 : 1;
  const col = slotIndex % perTier;
  const shelfWidth = 1.8;
  const spacing = shelfWidth / Math.max(1, perTier);
  const localX = -shelfWidth / 2 + spacing * (col + 0.5);
  const localY = tier === 0 ? 1.28 : 0.68;
  const localZ = 0.08;

  const rad = ((shelf.rotation_y || 0) * Math.PI) / 180;
  const rotX = localX * Math.cos(rad) + localZ * Math.sin(rad);
  const rotZ = -localX * Math.sin(rad) + localZ * Math.cos(rad);

  return [sx + rotX, localY, sz + rotZ];
}

export function detectZoneFromPosition(x: number, z: number): ZoneId {
  for (const zone of ZONE_LIST) {
    const [cx, cz] = zone.center;
    const [w, d] = zone.size;
    if (Math.abs(x - cx) <= w / 2 && Math.abs(z - cz) <= d / 2) {
      return zone.id;
    }
  }
  return 'lobby';
}

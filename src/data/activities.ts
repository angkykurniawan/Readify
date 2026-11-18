import type { ActivitySpot, ZoneId } from '../types/library';

export const ACTIVITY_SPOTS: ActivitySpot[] = [
  // Lobby — Sofa kiri & kanan
  {
    id: 'lobby_sofa_l',
    label: 'Duduk di Sofa Biru',
    zone_id: 'lobby',
    activity: 'sitting_lounge',
    seatPos: [-2.82, 6.55],
    approachPos: [-2.05, 6.55],
    facingY: Math.PI / 2,
    statusText: 'Bersantai di sofa Lobby',
    seatHeight: 0.42,
  },
  {
    id: 'lobby_sofa_r',
    label: 'Duduk di Sofa Amber',
    zone_id: 'lobby',
    activity: 'sitting_lounge',
    seatPos: [2.82, 6.55],
    approachPos: [2.05, 6.55],
    facingY: -Math.PI / 2,
    statusText: 'Bersantai di sofa Lobby',
    seatHeight: 0.42,
  },
  {
    id: 'lobby_desk',
    label: 'Ke Meja Sirkulasi',
    zone_id: 'lobby',
    activity: 'circulating',
    seatPos: [0, 3.65],
    approachPos: [0, 3.65],
    facingY: Math.PI,
    statusText: 'Di Meja Sirkulasi',
    seatHeight: 0,
  },

  // Ruang Baca & Diskusi — Kursi Meja Baca 1 (center [8.4, 5.4])
  {
    id: 'diskusi_t1_c1',
    label: 'Duduk & Membaca (Meja 1)',
    zone_id: 'diskusi',
    activity: 'sitting_read',
    seatPos: [7.75, 4.48],
    approachPos: [7.75, 3.95],
    facingY: 0,
    statusText: 'Membaca di Ruang Baca',
    seatHeight: 0.46,
  },
  {
    id: 'diskusi_t1_c2',
    label: 'Duduk & Berdiskusi (Meja 1)',
    zone_id: 'diskusi',
    activity: 'sitting_read',
    seatPos: [9.05, 4.48],
    approachPos: [9.05, 3.95],
    facingY: 0,
    statusText: 'Berdiskusi di Ruang Baca',
    seatHeight: 0.46,
  },
  {
    id: 'diskusi_t1_c3',
    label: 'Duduk & Membaca (Meja 1)',
    zone_id: 'diskusi',
    activity: 'sitting_read',
    seatPos: [7.75, 6.32],
    approachPos: [7.75, 6.85],
    facingY: Math.PI,
    statusText: 'Membaca di Ruang Baca',
    seatHeight: 0.46,
  },
  {
    id: 'diskusi_t1_c4',
    label: 'Duduk & Berdiskusi (Meja 1)',
    zone_id: 'diskusi',
    activity: 'sitting_read',
    seatPos: [9.05, 6.32],
    approachPos: [9.05, 6.85],
    facingY: Math.PI,
    statusText: 'Berdiskusi di Ruang Baca',
    seatHeight: 0.46,
  },

  // Ruang Baca & Diskusi — Kursi Meja Baca 2 (center [11.4, 7.6])
  {
    id: 'diskusi_t2_c1',
    label: 'Duduk & Membaca (Meja 2)',
    zone_id: 'diskusi',
    activity: 'sitting_read',
    seatPos: [10.75, 6.68],
    approachPos: [10.75, 6.15],
    facingY: 0,
    statusText: 'Membaca di Ruang Baca',
    seatHeight: 0.46,
  },
  {
    id: 'diskusi_t2_c2',
    label: 'Duduk & Membaca (Meja 2)',
    zone_id: 'diskusi',
    activity: 'sitting_read',
    seatPos: [12.05, 8.52],
    approachPos: [12.05, 9.05],
    facingY: Math.PI,
    statusText: 'Belajar di Ruang Baca',
    seatHeight: 0.46,
  },

  // Ruang Admin — Kursi Workstation Pustakawan (desk at [-9.8, 7.8])
  {
    id: 'admin_workstation',
    label: 'Duduk di Meja Pustakawan',
    zone_id: 'admin',
    activity: 'sitting_work',
    seatPos: [-9.8, 8.82],
    approachPos: [-8.2, 8.82],
    facingY: Math.PI,
    statusText: 'Mengelola katalog di Ruang Admin',
    seatHeight: 0.46,
    adminOnly: true,
  },
];

export function getActivitySpotById(id?: string | null): ActivitySpot | undefined {
  if (!id) return undefined;
  return ACTIVITY_SPOTS.find((s) => s.id === id);
}

export function getSpotsForZone(zoneId: ZoneId, isAdmin: boolean): ActivitySpot[] {
  return ACTIVITY_SPOTS.filter((s) => s.zone_id === zoneId && (!s.adminOnly || isAdmin));
}

export type UserRole = 'member' | 'admin';

export type ZoneId =
  | 'lobby'
  | 'fiksi'
  | 'sains'
  | 'bisnis'
  | 'sejarah'
  | 'diskusi'
  | 'admin';

export type AvatarActivity =
  | 'idle'
  | 'walking'
  | 'sitting_read'
  | 'sitting_lounge'
  | 'sitting_work'
  | 'reading_stand'
  | 'circulating';

export interface ActivitySpot {
  id: string;
  label: string;
  zone_id: ZoneId;
  activity: AvatarActivity;
  seatPos: [number, number]; // posisi tepat saat duduk/beraktivitas
  approachPos: [number, number]; // titik berdiri di dekat kursi sebelum duduk
  facingY: number; // arah hadap avatar (radian)
  statusText: string;
  seatHeight: number;
  adminOnly?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_color: string;
  created_at?: string;
}

export interface OnlineUser {
  session_token: string;
  user_id: number;
  user_name: string;
  role: UserRole;
  avatar_color: string;
  pos_x: number;
  pos_z: number;
  current_zone: ZoneId | string;
  activity: AvatarActivity;
  seat_id?: string | null;
  status_text: string;
  isJoining?: boolean;
  joinedAtMs?: number;
}

export interface Shelf {
  id: number;
  code: string;
  name: string;
  zone_id: ZoneId;
  grid_x: number;
  grid_z: number;
  rotation_y: number;
  accent_color: string;
  capacity: number;
  isNew?: boolean;
}

export interface Book {
  id: number;
  shelf_id: number;
  slot_index: number;
  title: string;
  author: string;
  category: string;
  publish_year: number;
  cover_color: string;
  summary: string;
  key_points: string[];
  file_name?: string | null;
  file_url?: string | null;
  content_text?: string | null;
  total_copies: number;
  available_copies: number;
  version: number;
}

export interface Loan {
  id: number;
  book_id: number;
  status: 'borrowed' | 'returned';
  borrowed_at: string;
  due_date: string | null;
  returned_at: string | null;
  title: string;
  author: string;
  shelf_id: number;
  slot_index: number;
  cover_color: string;
}

export type AIProvider = 'gemini' | 'openai' | 'openrouter' | 'groq' | 'custom';

export interface AIModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface AIConfig {
  provider: AIProvider;
  base_url: string;
  selected_model: string;
  is_configured: boolean;
  api_key?: string;
}

export interface FlyingBookAnim {
  id: string;
  type: 'borrow' | 'return';
  bookTitle: string;
  coverColor: string;
  actorName: string;
  from: [number, number, number];
  to: [number, number, number];
  startedAt: number;
  durationMs: number;
}

export interface RealtimeEvent {
  id: number;
  event_type:
    | 'user_join'
    | 'user_leave'
    | 'book_borrow'
    | 'book_return'
    | 'shelf_added'
    | 'shelf_deleted'
    | 'book_added'
    | 'book_updated'
    | 'book_deleted'
    | 'ai_updated';
  actor_id: number | null;
  actor_name: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: 'info' | 'success' | 'warning' | 'error';
}

export type ActiveDrawer =
  | 'none'
  | 'book'
  | 'loans'
  | 'catalog'
  | 'admin'
  | 'ai'
  | 'online';

export type CameraMode = 'eagle' | 'walk';

export type ModuleStatus = 'live' | 'beta' | 'coming_soon' | 'hidden';
export type ModuleArea = 'user' | 'admin';

export interface ModuleContract {
  key: string;
  area: ModuleArea;
  title_ar: string;
  status: ModuleStatus;
  required_permission: string | null;
  sort: number;
}

export interface StaffMe {
  id: string;
  full_name: string;
  role: string;
  role_title_ar: string;
  email_masked: string;
  phone_masked: string;
  permissions: string[];
  default_line_id: string | null;
  avatar_url?: string;
  working_hours?: string;
}

export interface WhatsAppLine {
  id: string;
  title_ar: string;
  phone_masked: string;
  kind: 'primary' | 'sales' | 'support' | 'promo';
  status: 'online' | 'warning' | 'offline';
  unread_count: number;
  battery_level?: number;
}

export interface ChatSessionResponse {
  url: string;
  token?: string;
  expires_at?: string;
}

export interface RoadmapInfo {
  version: string;
  description_ar: string;
  features_ar: string[];
  technical_note_ar?: string;
}

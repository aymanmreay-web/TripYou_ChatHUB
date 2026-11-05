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

export type MessageDirection = 'in' | 'out';
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MediaType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'sticker' | 'poll';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  chat_jid: string;
  direction: MessageDirection;
  body: string;
  media_type: MediaType;
  media_url?: string;
  sender_name: string;
  signature?: string;
  status: MessageStatus;
  line_id: string;
  created_at: string;
}

export type ConversationStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'snoozed' | 'escalated';

export interface ConversationItem {
  id: string;
  chat_jid: string;
  title: string;
  phone_or_jid: string;
  avatar_letter: string;
  avatar_url?: string;
  is_group: boolean;
  participant_count?: number;
  line_id: string;
  line_title: string;
  last_message_text: string;
  last_message_at: string;
  unread_count: number;
  tags?: string[];
  status: ConversationStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  last_customer_message_timestamp?: number;
  locked_line_id?: string;
}

export interface RoadmapInfo {
  version: string;
  description_ar: string;
  features_ar: string[];
  technical_note_ar?: string;
}

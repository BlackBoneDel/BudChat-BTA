// Tipos compartidos de Budsin Chat
export type Status = "online" | "away" | "dnd" | "invisible" | "offline";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: Status;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  banner_color: string | null;
  owner_id: string;
  created_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  topic: string;
  kind: "text" | "voice";
  position: number;
}

export interface ServerMember {
  server_id: string;
  user_id: string;
  role: "member" | "moderator" | "admin" | "owner";
  joined_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  content_html: string | null;
  attachments: Attachment[];
  reply_to: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  kind: "direct" | "group";
  name: string | null;
  owner_id: string | null;
  created_by: string;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: "member" | "admin";
  joined_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  author_id: string;
  content: string;
  content_html: string | null;
  reply_to: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface Invite {
  id: string;
  server_id: string | null;
  conversation_id: string | null;
  code: string;
  label: string;
  created_by: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  created_at: string;
}

export interface Presence {
  user_id: string;
  status: Status;
  last_seen: string;
  updated_at: string;
}

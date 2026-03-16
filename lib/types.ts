export type Entry = {
  id: string;
  date: string;
  title: string;
  photo_url: string | null;
  notes: string | null;
  hearts: number;
};

export type Couple = {
  id: string;
  user_a: string;
  user_b: string | null;
  invite_code: string;
};

export type Space = {
  id: string;
  couple_id: string;
  status: "active" | "paused" | "pending_delete" | "deleted";
  paused_at: string | null;
  paused_by: string | null;
  delete_requested_at: string | null;
  delete_requested_by: string | null;
  created_at: string;
};

export type MemberProfile = {
  id: string;
  avatar_url: string | null;
};

export type Letter = {
  id: string;
  couple_id: string;
  date: string;
  from_user: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

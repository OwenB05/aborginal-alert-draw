export type DrawStatus = "open" | "closed";

/** Columns visible to the public (anon) role — keep in sync with grants. */
export const PUBLIC_DRAW_COLUMNS = "id,slug,title,description,prize,status";

export interface PublicDraw {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  prize: string | null;
  status: DrawStatus;
}

export interface Draw extends PublicDraw {
  winner_entry_id: string | null;
  drawn_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  draw_id: string;
  full_name: string;
  email: string;
  signature_name: string;
  consent: boolean;
  created_at: string;
}

export interface WinnerResult {
  entry_id: string;
  full_name: string;
  email: string;
}

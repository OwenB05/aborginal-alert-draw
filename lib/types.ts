export type DrawStatus = "open" | "closed";

/** Columns visible to the public (anon) role — keep in sync with grants. */
export const PUBLIC_DRAW_COLUMNS = "id,slug,title,description,prize,status";

/** Entrants must sign up here before completing a draw entry (honor system —
 * clicking through unlocks the form). Opens in a new tab. */
export const COMPASSIONATE_CIRCLE_URL =
  "https://www.aboriginalalert.ca/compassionate-circle";

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

/** A single winner pick from the audit log; `entry` is embedded via the
 * winner_log.entry_id → entries FK (null if that entry was later removed). */
export interface WinnerLogEntry {
  id: number;
  entry_id: string;
  drawn_at: string;
  entry: { full_name: string; email: string } | null;
}

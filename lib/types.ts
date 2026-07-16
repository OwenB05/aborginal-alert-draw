export type DrawStatus = "open" | "closed";

/** Columns visible to the public (anon) role — keep in sync with grants. */
export const PUBLIC_DRAW_COLUMNS = "id,slug,title,description,prize,status";

/** Canadian provinces and territories (full names) for the entry form. */
export const CANADIAN_PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const;

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
  province: string | null;
  city: string | null;
  signature_name: string;
  /** Required permission to be added to the Compassionate Circle. */
  consent: boolean;
  /** Optional, separate opt-in to the mailing list (CASL: not pre-checked). */
  mailing_list_consent: boolean;
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

export interface Invite {
  id: string;
  email: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

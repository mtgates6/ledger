/**
 * This app has exactly one user. Every row is owned by this fixed id instead
 * of a Supabase Auth user id, since there's no per-account auth anymore —
 * just a single passcode gate in front of the whole app (see lib/session.ts).
 */
export const OWNER_ID = "00000000-0000-0000-0000-000000000001";

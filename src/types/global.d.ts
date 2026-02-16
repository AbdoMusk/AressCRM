import type { Database } from "@/lib/supabase/database.types";

/**
 * Global type augmentations for AressCRM.
 *
 * Provides convenient aliases so domain modules don't need to
 * repeatedly import and unwrap the auto-generated Supabase types.
 */

// ──────────────────────────────────────────────
// Database table row / insert / update shortcuts
// ──────────────────────────────────────────────
declare global {
  /** Shortcut to the public schema tables */
  type Tables = Database["public"]["Tables"];

  /** Row type for any public table */
  type TableRow<T extends keyof Tables> = Tables[T]["Row"];

  /** Insert type for any public table */
  type TableInsert<T extends keyof Tables> = Tables[T]["Insert"];

  /** Update type for any public table */
  type TableUpdate<T extends keyof Tables> = Tables[T]["Update"];

  // ──────────────────────────────────────────────
  // Common utility types
  // ──────────────────────────────────────────────

  /** A UUID string */
  type UUID = string;

  /** Nullable shorthand */
  type Nullable<T> = T | null;

  /** Async server action return — either success data or an error */
  type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string };
}

export {};

/**
 * OMP Engine — Module Type Definitions
 */

import type { Json } from "@/lib/supabase/database.types";

// ── Field Types ──────────────────────────────

export type ModuleFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "datetime"
  | "textarea"
  | "select"
  | "multiselect"
  | "boolean"
  | "url";

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface ModuleFieldDef {
  key: string;
  type: ModuleFieldType;
  label: string;
  required?: boolean;
  default?: string | number | boolean;
  options?: SelectOption[];
  min?: number;
  max?: number;
}

export interface ModuleSchema {
  fields: ModuleFieldDef[];
}

// ── Database Row Types ───────────────────────

export type ModuleRow = TableRow<"modules">;

export interface ModuleRowTyped extends Omit<ModuleRow, "schema"> {
  schema: ModuleSchema;
}

export type ObjectModuleRow = TableRow<"object_modules">;

export interface ObjectModuleRowTyped
  extends Omit<ObjectModuleRow, "data"> {
  data: Record<string, unknown>;
}

// ── Input Types ──────────────────────────────

export interface ModuleCreateInput {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  schema: ModuleSchema;
}

export interface ModuleUpdateInput {
  name?: string;
  display_name?: string;
  description?: string;
  icon?: string;
  schema?: ModuleSchema;
}

// ── Module with data (for object views) ──────

export interface AttachedModule {
  id: string; // object_module id
  moduleId: string;
  moduleName: string;
  displayName: string;
  icon: string | null;
  schema: ModuleSchema;
  data: Record<string, unknown>;
}

/**
 * Parse JSONB schema from database into typed ModuleSchema.
 */
export function parseModuleSchema(raw: Json): ModuleSchema {
  const obj = raw as Record<string, unknown>;
  const fields = (obj?.fields ?? []) as ModuleFieldDef[];
  return { fields };
}

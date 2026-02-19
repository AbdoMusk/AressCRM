/**
 * OMP Engine — Object Type Definitions
 */

import type { AttachedModule } from "./module.types";

// ── Database Row Types ───────────────────────

export type ObjectRow = TableRow<"objects">;
export type ObjectTypeRow = TableRow<"object_types">;
export type ObjectTypeModuleRow = TableRow<"object_type_modules">;

// ── Rich Types ───────────────────────────────

export interface ObjectTypeWithModules extends ObjectTypeRow {
  modules: {
    module_id: string;
    module_name: string;
    display_name: string;
    icon: string | null;
    required: boolean;
    position: number;
  }[];
}

/**
 * Extended object type that includes module schemas.
 * Used by the UI to render forms.
 */
export interface ObjectTypeWithSchemas extends ObjectTypeRow {
  modules: {
    module_id: string;
    module_name: string;
    display_name: string;
    icon: string | null;
    required: boolean;
    position: number;
    schema: import("./module.types").ModuleSchema;
  }[];
}

export interface ObjectWithModules extends ObjectRow {
  object_type: ObjectTypeRow;
  modules: AttachedModule[];
  /** Display label derived from identity/organization module */
  displayName: string;
}

export interface ObjectWithRelations extends ObjectWithModules {
  relations: RelatedObject[];
}

export interface RelatedObject {
  relationId: string;
  relationType: string;
  direction: "from" | "to";
  object: {
    id: string;
    objectType: string;
    displayName: string;
  };
}

// ── Input Types ──────────────────────────────

export interface ObjectCreateInput {
  objectTypeId: string;
  ownerId?: string;
  /** Module data keyed by module name */
  modules: Record<string, Record<string, unknown>>;
}

export interface ObjectUpdateModuleInput {
  moduleId: string;
  data: Record<string, unknown>;
}

export interface ObjectTypeCreateInput {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  modules: {
    module_id: string;
    required: boolean;
    position: number;
  }[];
}

export interface ObjectTypeUpdateInput {
  name?: string;
  display_name?: string;
  description?: string;
  icon?: string;
  color?: string;
  modules?: {
    module_id: string;
    required: boolean;
    position: number;
  }[];
}

// ── Filter/Query Types ───────────────────────

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "contains"
  | "starts_with";

export interface ObjectFilter {
  moduleName: string;
  fieldKey: string;
  operator: FilterOperator;
  value: string | number;
}

export interface ObjectQueryParams {
  objectType?: string;
  filters?: ObjectFilter[];
  sortModule?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

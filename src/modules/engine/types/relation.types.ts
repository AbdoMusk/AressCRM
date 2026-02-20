/**
 * OMP Engine — Relation Type Definitions
 */

export type RelationRow = TableRow<"object_relations">;
export type ObjectTypeRelationRow = TableRow<"object_type_relations">;

// ── Instance-level Relations ─────────────────

export interface RelationCreateInput {
  fromObjectId: string;
  toObjectId: string;
  relationType: string;
  metadata?: Record<string, unknown>;
}

/** Common relation type constants (instance-level) */
export const RelationTypes = {
  WORKS_FOR: "works_for",
  BELONGS_TO: "belongs_to",
  ASSIGNED_TO: "assigned_to",
  PARENT_OF: "parent_of",
  RELATED_TO: "related_to",
} as const;

export type RelationType = (typeof RelationTypes)[keyof typeof RelationTypes];

// ── Schema-level Relation Definitions ────────

export type SchemaRelationType = "one_to_many" | "many_to_one" | "many_to_many";

export const SchemaRelationTypes: { value: SchemaRelationType; label: string }[] = [
  { value: "one_to_many", label: "One to Many" },
  { value: "many_to_one", label: "Many to One" },
  { value: "many_to_many", label: "Many to Many" },
];

export interface ObjectTypeRelation {
  id: string;
  source_type_id: string;
  target_type_id: string;
  relation_type: SchemaRelationType;
  source_field_name: string;
  target_field_name: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Enriched fields
  source_type_name?: string;
  source_type_display_name?: string;
  target_type_name?: string;
  target_type_display_name?: string;
}

export interface ObjectTypeRelationCreateInput {
  source_type_id: string;
  target_type_id: string;
  relation_type: SchemaRelationType;
  source_field_name: string;
  target_field_name: string;
}

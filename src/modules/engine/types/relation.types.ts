/**
 * OMP Engine — Relation Type Definitions
 */

export type RelationRow = TableRow<"object_relations">;

export interface RelationCreateInput {
  fromObjectId: string;
  toObjectId: string;
  relationType: string;
  metadata?: Record<string, unknown>;
}

/** Common relation type constants */
export const RelationTypes = {
  WORKS_FOR: "works_for",
  BELONGS_TO: "belongs_to",
  ASSIGNED_TO: "assigned_to",
  PARENT_OF: "parent_of",
  RELATED_TO: "related_to",
} as const;

export type RelationType = (typeof RelationTypes)[keyof typeof RelationTypes];

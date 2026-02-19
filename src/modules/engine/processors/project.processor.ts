/**
 * OMP Engine — Project Processor
 *
 * Operates on objects that have both "organization" and "stage" modules.
 * Provides project-level analysis: health scoring, timeline awareness,
 * and organizational context.
 *
 * Eligible objects: any object with "organization" + "stage" modules
 * Optional modules: "monetary" (for budget tracking), "notes" (for activity)
 */

import {
  BaseProcessor,
  type ProcessorSpec,
  type ProcessorContext,
  type ProcessorResult,
} from "./base.processor";

export interface ProjectResult {
  /** Company / organization name */
  organizationName: string;
  /** Current project status */
  status: string;
  /** Health score 0-100 based on age, stage, and completeness */
  healthScore: number;
  /** Health label: healthy | at-risk | critical */
  healthLabel: "healthy" | "at-risk" | "critical";
  /** Whether the project has budget information */
  hasBudget: boolean;
  /** Budget amount if available */
  budgetAmount?: number;
  /** Module completeness: how many optional modules are attached */
  completeness: {
    totalModules: number;
    filledFields: number;
    totalFields: number;
    percentage: number;
  };
  /** Days since creation */
  ageDays: number;
  /** Days since last update */
  daysSinceUpdate: number;
}

/**
 * Weight factors for health score computation.
 */
const HEALTH_WEIGHTS = {
  stageProgress: 0.3,
  completeness: 0.3,
  recency: 0.2,
  assignment: 0.2,
};

/** Stage ordering for progress calculation */
const STAGE_ORDER: Record<string, number> = {
  new: 1,
  contacted: 2,
  interested: 3,
  qualified: 4,
  proposal: 5,
  negotiation: 6,
  won: 7,
  lost: 0,
  completed: 7,
  closed: 7,
};

const MAX_STAGE = 7;

export class ProjectProcessor extends BaseProcessor<ProjectResult> {
  readonly spec: ProcessorSpec = {
    name: "project",
    description:
      "Provides project-level health scoring, organizational context, and completeness analysis",
    requiredModules: ["organization", "stage"],
    optionalModules: ["monetary", "notes"],
  };

  async process(
    ctx: ProcessorContext
  ): Promise<ProcessorResult<ProjectResult>> {
    const { object, timestamp } = ctx;

    // ── Extract organization data ──
    const organizationName =
      this.getFieldValue<string>(object, "organization", "company_name") ??
      this.getFieldValue<string>(object, "organization", "name") ??
      "Unknown Organization";

    // ── Extract stage data ──
    const status = (
      this.getFieldValue<string>(object, "stage", "stage") ??
      this.getFieldValue<string>(object, "stage", "status") ??
      "new"
    ).toLowerCase().trim();

    // ── Budget info (optional) ──
    const hasBudget = this.hasModule(object, "monetary");
    const budgetAmount = hasBudget
      ? this.getFieldValue<number>(object, "monetary", "amount") ??
        this.getFieldValue<number>(object, "monetary", "value")
      : undefined;

    // ── Calculate completeness ──
    const totalModules = object.modules.length;
    let filledFields = 0;
    let totalFields = 0;

    for (const mod of object.modules) {
      for (const field of mod.schema.fields) {
        totalFields++;
        const val = mod.data[field.key];
        if (val != null && val !== "" && val !== false) {
          filledFields++;
        }
      }
    }

    const completenessPercentage =
      totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100;

    // ── Calculate age/recency ──
    const now = new Date(timestamp);
    const createdAt = new Date(object.created_at);
    const updatedAt = new Date(object.updated_at);
    const ageDays = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceUpdate = Math.floor(
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // ── Compute health score ──
    const stageIdx = STAGE_ORDER[status] ?? 1;
    const stageScore = (stageIdx / MAX_STAGE) * 100;
    const completenessScore = completenessPercentage;
    const recencyScore = Math.max(0, 100 - daysSinceUpdate * 5); // Degrades 5pts/day
    const assignmentScore = object.owner_id ? 100 : 0;

    const healthScore = Math.round(
      stageScore * HEALTH_WEIGHTS.stageProgress +
        completenessScore * HEALTH_WEIGHTS.completeness +
        recencyScore * HEALTH_WEIGHTS.recency +
        assignmentScore * HEALTH_WEIGHTS.assignment
    );

    const healthLabel: ProjectResult["healthLabel"] =
      healthScore >= 60 ? "healthy" : healthScore >= 30 ? "at-risk" : "critical";

    return {
      success: true,
      processor: this.spec.name,
      data: {
        organizationName,
        status,
        healthScore,
        healthLabel,
        hasBudget,
        budgetAmount,
        completeness: {
          totalModules,
          filledFields,
          totalFields,
          percentage: completenessPercentage,
        },
        ageDays,
        daysSinceUpdate,
      },
    };
  }
}

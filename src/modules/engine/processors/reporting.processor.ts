/**
 * OMP Engine — Reporting Processor
 *
 * Operates on objects that have a "monetary" module.
 * Provides aggregation, value summaries, and reporting insights.
 *
 * Eligible objects: any object with a "monetary" module (deals, invoices, etc.)
 * Optional modules: "stage" (for pipeline-aware reporting), "identity" (for attribution)
 */

import {
  BaseProcessor,
  type ProcessorSpec,
  type ProcessorContext,
  type ProcessorResult,
} from "./base.processor";

export interface ReportingResult {
  /** The monetary value from this object */
  value: number;
  /** Currency if defined */
  currency: string;
  /** Stage this value is at (if stage module exists) */
  stage?: string;
  /** Whether this is "closed" (won/completed) revenue */
  isClosed: boolean;
  /** Whether this value represents a win */
  isWon: boolean;
  /** Attribution — who created/owns this value */
  attribution?: {
    name?: string;
    email?: string;
  };
  /** Computed weighted value based on stage probability */
  weightedValue: number;
}

/**
 * Stage-to-probability mapping for weighted pipeline reporting.
 * Default probabilities if not specified in module data.
 */
const STAGE_PROBABILITIES: Record<string, number> = {
  new: 0.1,
  contacted: 0.2,
  interested: 0.3,
  qualified: 0.4,
  proposal: 0.5,
  negotiation: 0.7,
  won: 1.0,
  lost: 0.0,
  completed: 1.0,
  closed: 1.0,
};

export class ReportingProcessor extends BaseProcessor<ReportingResult> {
  readonly spec: ProcessorSpec = {
    name: "reporting",
    description:
      "Aggregates monetary data for pipeline reporting and revenue forecasting",
    requiredModules: ["monetary"],
    optionalModules: ["stage", "identity"],
  };

  async process(
    ctx: ProcessorContext
  ): Promise<ProcessorResult<ReportingResult>> {
    const { object } = ctx;

    // ── Extract monetary data ──
    const value =
      (this.getFieldValue<number>(object, "monetary", "amount") ??
        this.getFieldValue<number>(object, "monetary", "value")) ||
      0;
    const currency =
      (this.getFieldValue<string>(object, "monetary", "currency")) ?? "USD";

    // ── Extract stage data (optional) ──
    const stage =
      this.getFieldValue<string>(object, "stage", "stage") ??
      this.getFieldValue<string>(object, "stage", "status");

    const normalizedStage = stage?.toLowerCase().trim();

    const isClosed =
      normalizedStage === "won" ||
      normalizedStage === "lost" ||
      normalizedStage === "completed" ||
      normalizedStage === "closed";

    const isWon =
      normalizedStage === "won" || normalizedStage === "completed";

    // ── Compute weighted value ──
    const probability =
      normalizedStage ? (STAGE_PROBABILITIES[normalizedStage] ?? 0.5) : 1.0;
    const weightedValue = value * probability;

    // ── Extract attribution (optional) ──
    let attribution: ReportingResult["attribution"];
    if (this.hasModule(object, "identity")) {
      attribution = {
        name: this.getFieldValue<string>(object, "identity", "name"),
        email: this.getFieldValue<string>(object, "identity", "email"),
      };
    }

    return {
      success: true,
      processor: this.spec.name,
      data: {
        value,
        currency,
        stage: normalizedStage,
        isClosed,
        isWon,
        attribution,
        weightedValue,
      },
    };
  }
}

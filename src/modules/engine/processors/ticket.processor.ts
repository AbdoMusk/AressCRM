/**
 * OMP Engine — Ticket Processor
 *
 * Operates on objects that have a "stage" module.
 * Enforces status transition rules, assignment validation,
 * and SLA-related business logic.
 *
 * Eligible objects: any object with a "stage" module (leads, tickets, issues, etc.)
 * Optional modules: "identity" (for assignee info), "notes" (for history)
 */

import {
  BaseProcessor,
  type ProcessorSpec,
  type ProcessorContext,
  type ProcessorResult,
} from "./base.processor";

export interface TicketResult {
  /** Current status/stage */
  currentStage: string;
  /** Valid next stages this object can transition to */
  validTransitions: string[];
  /** Whether the ticket is in a terminal state */
  isTerminal: boolean;
  /** Priority level (inferred or explicit) */
  priority: "low" | "medium" | "high" | "urgent";
  /** Whether the ticket is assigned to someone */
  isAssigned: boolean;
  /** Assignee info if available */
  assignee?: { name?: string; email?: string };
  /** Age in days since creation */
  ageDays: number;
  /** Whether the ticket is considered stale (>7 days without progress) */
  isStale: boolean;
}

/**
 * Defines valid stage transitions.
 * A ticket can only move to stages defined here.
 * "*" means any stage is valid (used as a fallback).
 */
const TRANSITION_MAP: Record<string, string[]> = {
  new: ["contacted", "interested", "lost"],
  contacted: ["interested", "negotiation", "lost"],
  interested: ["qualified", "negotiation", "lost"],
  qualified: ["proposal", "negotiation", "lost"],
  proposal: ["negotiation", "won", "lost"],
  negotiation: ["won", "lost"],
  won: [], // Terminal
  lost: ["new"], // Can be re-opened
  completed: [],
  closed: [],
};

/** Stages considered terminal (no further action expected) */
const TERMINAL_STAGES = new Set(["won", "lost", "completed", "closed"]);

/** Days after which a non-terminal ticket is considered stale */
const STALE_THRESHOLD_DAYS = 7;

export class TicketProcessor extends BaseProcessor<TicketResult> {
  readonly spec: ProcessorSpec = {
    name: "ticket",
    description:
      "Enforces status transition rules, assignment validation, and staleness detection",
    requiredModules: ["stage"],
    optionalModules: ["identity", "notes"],
  };

  async process(
    ctx: ProcessorContext
  ): Promise<ProcessorResult<TicketResult>> {
    const { object, timestamp } = ctx;

    // ── Extract stage data ──
    const currentStage = (
      this.getFieldValue<string>(object, "stage", "stage") ??
      this.getFieldValue<string>(object, "stage", "status") ??
      "new"
    ).toLowerCase().trim();

    // ── Determine valid transitions ──
    const validTransitions =
      TRANSITION_MAP[currentStage] ??
      // Fallback: allow any non-current stage
      Object.keys(TRANSITION_MAP).filter((s) => s !== currentStage);

    const isTerminal = TERMINAL_STAGES.has(currentStage);

    // ── Extract priority ──
    const rawPriority =
      this.getFieldValue<string>(object, "stage", "priority") ?? "medium";
    const priority = (["low", "medium", "high", "urgent"].includes(
      rawPriority.toLowerCase()
    )
      ? rawPriority.toLowerCase()
      : "medium") as TicketResult["priority"];

    // ── Check assignment ──
    const isAssigned = !!object.owner_id;
    let assignee: TicketResult["assignee"];
    if (this.hasModule(object, "identity")) {
      assignee = {
        name: this.getFieldValue<string>(object, "identity", "name"),
        email: this.getFieldValue<string>(object, "identity", "email"),
      };
    }

    // ── Calculate age and staleness ──
    const createdAt = new Date(object.created_at);
    const now = new Date(timestamp);
    const ageDays = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isStale = !isTerminal && ageDays >= STALE_THRESHOLD_DAYS;

    return {
      success: true,
      processor: this.spec.name,
      data: {
        currentStage,
        validTransitions,
        isTerminal,
        priority,
        isAssigned,
        assignee,
        ageDays,
        isStale,
      },
    };
  }
}

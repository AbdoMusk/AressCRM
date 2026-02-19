/**
 * OMP Engine — Processor Registry
 *
 * Auto-registers all built-in processors on import.
 * Import this module at application startup to ensure processors are available.
 */

export {
  BaseProcessor,
  registerProcessor,
  getProcessors,
  getEligibleProcessors,
  runProcessors,
  type ProcessorSpec,
  type ProcessorContext,
  type ProcessorResult,
} from "./base.processor";

export { ReportingProcessor, type ReportingResult } from "./reporting.processor";
export { TicketProcessor, type TicketResult } from "./ticket.processor";
export { ProjectProcessor, type ProjectResult } from "./project.processor";

// ── Auto-register built-in processors ────────

import { registerProcessor } from "./base.processor";
import { ReportingProcessor } from "./reporting.processor";
import { TicketProcessor } from "./ticket.processor";
import { ProjectProcessor } from "./project.processor";

let _initialized = false;

export function initProcessors(): void {
  if (_initialized) return;

  registerProcessor(new ReportingProcessor());
  registerProcessor(new TicketProcessor());
  registerProcessor(new ProjectProcessor());

  _initialized = true;
}

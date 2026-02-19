/**
 * OMP Engine — Base Processor
 *
 * Processors are stateless business-logic units that operate on objects
 * based on their MODULE composition, NOT their object type.
 *
 * Key design principle:
 *   if (object.has(MonetaryModule)) { … }     ✅
 *   if (object.type === "deal")     { … }     ❌
 *
 * This means a processor can apply to ANY object that has the required
 * modules, making the engine truly composable and extensible.
 *
 * Processors NEVER bypass RLS. They use the same service layer
 * as the rest of the application.
 */

import type { ObjectWithModules } from "../types/object.types";
import type { AttachedModule } from "../types/module.types";
import type { AuthContext } from "@/lib/permissions/rbac";

// ── Processor interface ──────────────────────

export interface ProcessorSpec {
  /** Unique processor name (used for registration & logging) */
  name: string;
  /** Human-readable description */
  description: string;
  /**
   * Module names this processor requires.
   * An object is eligible only if it has ALL required modules.
   */
  requiredModules: string[];
  /**
   * Optional modules the processor can use if present.
   */
  optionalModules?: string[];
}

export interface ProcessorContext {
  /** Authenticated user context — never bypasses RLS */
  auth: AuthContext;
  /** The target object with its attached modules */
  object: ObjectWithModules;
  /** ISO timestamp of when this processing run started */
  timestamp: string;
}

export type ProcessorResult<T = unknown> = {
  success: true;
  data: T;
  processor: string;
} | {
  success: false;
  error: string;
  processor: string;
};

/**
 * Abstract processor base class.
 * Subclasses implement `process()` with domain-specific logic.
 */
export abstract class BaseProcessor<TResult = unknown> {
  abstract readonly spec: ProcessorSpec;

  /**
   * Check whether an object is eligible for this processor
   * (i.e. it has all required modules).
   */
  isEligible(object: ObjectWithModules): boolean {
    return this.spec.requiredModules.every((reqMod) =>
      object.modules.some((m) => m.moduleName === reqMod)
    );
  }

  /**
   * Get a specific module from the object by name.
   * Returns undefined if not attached.
   */
  protected getModule(
    object: ObjectWithModules,
    moduleName: string
  ): AttachedModule | undefined {
    return object.modules.find((m) => m.moduleName === moduleName);
  }

  /**
   * Get the value of a specific field from a module.
   */
  protected getFieldValue<T = unknown>(
    object: ObjectWithModules,
    moduleName: string,
    fieldKey: string
  ): T | undefined {
    const mod = this.getModule(object, moduleName);
    return mod?.data[fieldKey] as T | undefined;
  }

  /**
   * Check if the object has a specific module.
   */
  protected hasModule(
    object: ObjectWithModules,
    moduleName: string
  ): boolean {
    return object.modules.some((m) => m.moduleName === moduleName);
  }

  /**
   * Core processing logic. Implemented by each processor.
   */
  abstract process(ctx: ProcessorContext): Promise<ProcessorResult<TResult>>;

  /**
   * Safe execution wrapper with eligibility check and error handling.
   */
  async execute(ctx: ProcessorContext): Promise<ProcessorResult<TResult>> {
    if (!this.isEligible(ctx.object)) {
      return {
        success: false,
        error: `Object '${ctx.object.displayName}' is missing required modules: ${this.spec.requiredModules.join(", ")}`,
        processor: this.spec.name,
      };
    }

    try {
      return await this.process(ctx);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown processor error",
        processor: this.spec.name,
      };
    }
  }
}

// ── Processor Registry ───────────────────────

const registeredProcessors: BaseProcessor[] = [];

/**
 * Register a processor instance. Should be called once at startup.
 */
export function registerProcessor(processor: BaseProcessor): void {
  if (registeredProcessors.some((p) => p.spec.name === processor.spec.name)) {
    throw new Error(`Processor '${processor.spec.name}' is already registered`);
  }
  registeredProcessors.push(processor);
}

/**
 * Get all registered processors.
 */
export function getProcessors(): ReadonlyArray<BaseProcessor> {
  return registeredProcessors;
}

/**
 * Find all processors that are eligible for a given object.
 */
export function getEligibleProcessors(
  object: ObjectWithModules
): BaseProcessor[] {
  return registeredProcessors.filter((p) => p.isEligible(object));
}

/**
 * Run all eligible processors on an object and collect results.
 */
export async function runProcessors(
  auth: AuthContext,
  object: ObjectWithModules
): Promise<ProcessorResult[]> {
  const eligible = getEligibleProcessors(object);
  const timestamp = new Date().toISOString();

  const results = await Promise.allSettled(
    eligible.map((p) => p.execute({ auth, object, timestamp }))
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          success: false as const,
          error: r.reason?.message ?? "Processor crashed",
          processor: eligible[i].spec.name,
        }
  );
}

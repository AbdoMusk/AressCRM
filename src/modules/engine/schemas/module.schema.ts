/**
 * OMP Engine — Module Definition Schemas
 *
 * Zod schemas for validating module creation/update inputs.
 */

import { z } from "zod/v4";
import { moduleSchemaValidator } from "./dynamic-validator";

export const moduleCreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores only"),
  display_name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  schema: moduleSchemaValidator,
});

export const moduleUpdateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores only")
    .optional(),
  display_name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  schema: moduleSchemaValidator.optional(),
});

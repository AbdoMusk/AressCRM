/**
 * OMP Engine — Object Type Definition Schemas
 */

import { z } from "zod/v4";

export const objectTypeCreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores only"),
  display_name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
  modules: z.array(
    z.object({
      module_id: z.string().uuid(),
      required: z.boolean(),
      position: z.number().int().min(0),
    })
  ),
});

export const objectTypeUpdateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z_][a-z0-9_]*$/)
    .optional(),
  display_name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  modules: z
    .array(
      z.object({
        module_id: z.string().uuid(),
        required: z.boolean(),
        position: z.number().int().min(0),
      })
    )
    .optional(),
});

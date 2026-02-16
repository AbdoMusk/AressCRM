import { z } from "zod";

export const statusCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, "Slug must be lowercase alphanumeric with dashes/underscores"),
  color: z.string().max(20).default("#6b7280"),
  position: z.number().int().min(0),
  is_win: z.boolean().default(false),
  is_loss: z.boolean().default(false),
});

export const statusUpdateSchema = statusCreateSchema.partial();

export const sourceCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, "Slug must be lowercase alphanumeric with dashes/underscores"),
  icon: z.string().max(50).nullable().optional(),
  position: z.number().int().min(0),
});

export const sourceUpdateSchema = sourceCreateSchema.partial();

/**
 * OMP Engine — Dynamic Schema Validator
 *
 * Generates Zod schemas at runtime from ModuleSchema definitions.
 * Used to validate object module data on create/update.
 */

import { z } from "zod/v4";
import type { ModuleFieldDef, ModuleSchema } from "../types/module.types";

/**
 * Build a Zod schema from a single field definition.
 */
function buildFieldSchema(field: ModuleFieldDef): z.ZodType {
  let schema: z.ZodType;

  switch (field.type) {
    case "text":
    case "phone":
      schema = z.string();
      break;

    case "email":
      schema = z.email();
      break;

    case "url":
      schema = z.url();
      break;

    case "textarea":
      schema = z.string();
      break;

    case "number": {
      let numSchema = z.number();
      if (field.min !== undefined) numSchema = numSchema.min(field.min);
      if (field.max !== undefined) numSchema = numSchema.max(field.max);
      schema = numSchema;
      break;
    }

    case "date":
    case "datetime":
      schema = z.string(); // ISO date strings
      break;

    case "boolean":
      schema = z.boolean();
      break;

    case "select": {
      if (field.options && field.options.length > 0) {
        const values = field.options.map((o) => o.value);
        schema = z.enum(values as [string, ...string[]]);
      } else {
        schema = z.string();
      }
      break;
    }

    case "multiselect": {
      if (field.options && field.options.length > 0) {
        const values = field.options.map((o) => o.value);
        schema = z.array(z.enum(values as [string, ...string[]]));
      } else {
        schema = z.array(z.string());
      }
      break;
    }

    default:
      schema = z.string();
  }

  // Make optional fields nullable/optional
  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Build a complete Zod object schema from a ModuleSchema definition.
 * Returns a schema that validates module data according to field definitions.
 */
export function buildModuleValidator(
  moduleSchema: ModuleSchema
): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {};

  for (const field of moduleSchema.fields) {
    shape[field.key] = buildFieldSchema(field);
  }

  return z.object(shape).passthrough();
}

/**
 * Validate module data against its schema definition.
 * Returns { success, data, errors }.
 */
export function validateModuleData(
  moduleSchema: ModuleSchema,
  data: Record<string, unknown>
): {
  success: boolean;
  data: Record<string, unknown>;
  errors: string[];
} {
  const validator = buildModuleValidator(moduleSchema);
  const result = validator.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown>, errors: [] };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, data, errors };
}

/**
 * Apply default values from schema to partial data.
 */
export function applyDefaults(
  moduleSchema: ModuleSchema,
  data: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...data };

  for (const field of moduleSchema.fields) {
    if (field.default !== undefined && result[field.key] === undefined) {
      result[field.key] = field.default;
    }
  }

  return result;
}

/**
 * Validate a ModuleSchema definition itself (meta-validation).
 * Used when creating/updating module definitions.
 */
export const moduleSchemaValidator = z.object({
  fields: z.array(
    z.object({
      key: z.string().min(1),
      type: z.enum([
        "text",
        "email",
        "phone",
        "number",
        "date",
        "datetime",
        "textarea",
        "select",
        "multiselect",
        "boolean",
        "url",
      ]),
      label: z.string().min(1),
      required: z.boolean().optional(),
      default: z.union([z.string(), z.number(), z.boolean()]).optional(),
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            color: z.string().optional(),
          })
        )
        .optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
  ),
});

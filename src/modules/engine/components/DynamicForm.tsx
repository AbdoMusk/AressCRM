"use client";

import { DynamicField } from "./DynamicField";
import type { ModuleSchema } from "@/modules/engine/types/module.types";

interface DynamicFormProps {
  schema: ModuleSchema;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * Renders a full form for a single module by mapping its schema fields
 * to DynamicField controls. Manages a flat key-value data object.
 */
export function DynamicForm({ schema, data, onChange, disabled }: DynamicFormProps) {
  function handleFieldChange(key: string, value: unknown) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-3">
      {schema.fields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={data[field.key]}
          onChange={handleFieldChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

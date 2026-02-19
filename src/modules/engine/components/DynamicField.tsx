"use client";

import type { ModuleFieldDef, SelectOption } from "@/modules/engine/types/module.types";

/**
 * Common Tailwind classes shared across the engine UI.
 */
export const tw = {
  input:
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white",
  label: "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300",
  card: "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900",
  btnPrimary:
    "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50",
  btnSecondary:
    "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",
  btnDanger:
    "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50",
  error:
    "rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400",
  badge:
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
};

// ── DynamicField ─────────────────────────────

interface DynamicFieldProps {
  field: ModuleFieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

/**
 * Renders an appropriate input control based on the module field definition.
 */
export function DynamicField({ field, value, onChange, disabled }: DynamicFieldProps) {
  const id = `field-${field.key}`;

  const handleChange = (val: unknown) => onChange(field.key, val);

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "url":
      return (
        <div>
          <label htmlFor={id} className={tw.label}>
            {field.label}
            {field.required && " *"}
          </label>
          <input
            id={id}
            type={field.type === "phone" ? "tel" : field.type === "url" ? "url" : field.type}
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            disabled={disabled}
            className={tw.input}
          />
        </div>
      );

    case "number":
      return (
        <div>
          <label htmlFor={id} className={tw.label}>
            {field.label}
            {field.required && " *"}
          </label>
          <input
            id={id}
            type="number"
            value={value != null ? String(value) : ""}
            onChange={(e) =>
              handleChange(e.target.value === "" ? null : Number(e.target.value))
            }
            required={field.required}
            min={field.min}
            max={field.max}
            step="any"
            disabled={disabled}
            className={tw.input}
          />
        </div>
      );

    case "date":
      return (
        <div>
          <label htmlFor={id} className={tw.label}>
            {field.label}
            {field.required && " *"}
          </label>
          <input
            id={id}
            type="date"
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value || null)}
            required={field.required}
            disabled={disabled}
            className={tw.input}
          />
        </div>
      );

    case "datetime":
      return (
        <div>
          <label htmlFor={id} className={tw.label}>
            {field.label}
            {field.required && " *"}
          </label>
          <input
            id={id}
            type="datetime-local"
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value || null)}
            required={field.required}
            disabled={disabled}
            className={tw.input}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <label htmlFor={id} className={tw.label}>
            {field.label}
            {field.required && " *"}
          </label>
          <textarea
            id={id}
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            disabled={disabled}
            rows={3}
            className={tw.input}
          />
        </div>
      );

    case "select":
      return (
        <div>
          <label htmlFor={id} className={tw.label}>
            {field.label}
            {field.required && " *"}
          </label>
          <select
            id={id}
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value || null)}
            required={field.required}
            disabled={disabled}
            className={tw.input}
          >
            <option value="">— Select —</option>
            {(field.options ?? []).map((opt: SelectOption) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "multiselect":
      return (
        <div>
          <label className={tw.label}>
            {field.label}
            {field.required && " *"}
          </label>
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt: SelectOption) => {
              const selected = Array.isArray(value) && value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const current = Array.isArray(value) ? [...value] : [];
                    if (selected) {
                      handleChange(current.filter((v) => v !== opt.value));
                    } else {
                      handleChange([...current, opt.value]);
                    }
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          />
          <label htmlFor={id} className="text-sm text-gray-700 dark:text-gray-300">
            {field.label}
          </label>
        </div>
      );

    default:
      return (
        <div>
          <label htmlFor={id} className={tw.label}>
            {field.label}
          </label>
          <input
            id={id}
            type="text"
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className={tw.input}
          />
        </div>
      );
  }
}

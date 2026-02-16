import { NextResponse } from "next/server";
import { AppError } from "./errors";

// NEW: Centralized error handler for API routes
// Provides consistent error responses with proper HTTP status codes
const STATUS_MAP: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  DB_ERROR: 500,
};

export function handleApiError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: STATUS_MAP[err.code] ?? 500 }
    );
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json(
    { error: "Internal Server Error" },
    { status: 500 }
  );
}

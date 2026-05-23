import { NextResponse } from "next/server";

type SuccessPayload<T> = { data: T; error: null; success: true };
type ErrorPayload = { data: null; error: string; success: false };
export type ApiResult<T> = SuccessPayload<T> | ErrorPayload;

export function ok<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json({ data, error: null, success: true }, { status });
}

export function err(message: string, status = 400): NextResponse<ApiResult<never>> {
  return NextResponse.json({ data: null, error: message, success: false }, { status });
}

export function unauthorized(): NextResponse<ApiResult<never>> {
  return err("Unauthorized", 401);
}

export function forbidden(): NextResponse<ApiResult<never>> {
  return err("Forbidden", 403);
}

export function notFound(entity = "Resource"): NextResponse<ApiResult<never>> {
  return err(`${entity} not found`, 404);
}

export function tooManyRequests(): NextResponse<ApiResult<never>> {
  return err("Too many requests. Please slow down.", 429);
}

export function serverError(e: unknown): NextResponse<ApiResult<never>> {
  const message =
    process.env.NODE_ENV === "development" && e instanceof Error
      ? e.message
      : "Internal server error";
  return err(message, 500);
}

// ── V1 public API helpers ─────────────────────────────────────────────────────
// V1 shape: { success, data?, pagination?, error? } — no `error: null` on success.
// Used by /api/v1/* routes that authenticate via API key (not session cookie).

export function v1Error(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : "Internal error";
  const status =
    msg.includes("Missing") || msg.includes("Invalid") || msg.includes("expired") || msg.includes("Unauthorized") ? 401
    : msg.includes("scope") ? 403
    : 500;
  return NextResponse.json({ success: false, error: msg }, { status });
}

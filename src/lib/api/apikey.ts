import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export type ApiKeySession = {
  keyId: string;
  companyId: string;
  scopes: string[];
};

// ── Key generation ────────────────────────────────────────────────────────────

export function generateRawKey(): string {
  return `ghrm_${randomBytes(32).toString("hex")}`;
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function keyPrefix(raw: string): string {
  return raw.slice(0, 16);
}

// ── Auth middleware ───────────────────────────────────────────────────────────

/**
 * Validates X-API-Key header. Throws plain Error messages safe to surface in 401 responses.
 */
export async function requireApiKey(req: NextRequest): Promise<ApiKeySession> {
  const raw = req.headers.get("x-api-key");
  if (!raw) throw new Error("Missing X-API-Key header");

  const hash = hashKey(raw);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, companyId: true, scopes: true, isActive: true, expiresAt: true },
  });

  if (!apiKey || !apiKey.isActive) throw new Error("Invalid or revoked API key");
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new Error("API key expired");

  // Non-blocking usage tracking
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { keyId: apiKey.id, companyId: apiKey.companyId, scopes: apiKey.scopes };
}

/**
 * Throws if the session lacks the required scope.
 * Scope format: "resource:action" e.g. "employees:read"
 */
export function requireScope(session: ApiKeySession, scope: string): void {
  if (!session.scopes.includes(scope) && !session.scopes.includes("*")) {
    throw new Error(`API key lacks required scope: ${scope}`);
  }
}

export { AVAILABLE_SCOPES, type Scope } from "./scopes";

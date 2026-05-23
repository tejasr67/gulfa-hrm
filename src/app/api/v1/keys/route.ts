import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { generateRawKey, hashKey, keyPrefix, AVAILABLE_SCOPES } from "@/lib/api/apikey";
import { v1Error } from "@/lib/api/response";

type Scope = typeof AVAILABLE_SCOPES[number]["value"];
const VALID_SCOPES = AVAILABLE_SCOPES.map((s) => s.value) as [Scope, ...Scope[]];

// ── GET /api/v1/keys ──────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const { companyId } = await requireSession();

    const keys = await prisma.apiKey.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        lastUsedAt: true, expiresAt: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: keys });
  } catch (e) {
    return v1Error(e);
  }
}

// ── POST /api/v1/keys ─────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1),
  expiresAt: z.coerce.date().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { companyId, userId } = await requireSession();

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    const rawKey = generateRawKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        companyId,
        name: parsed.data.name,
        keyHash: hashKey(rawKey),
        keyPrefix: keyPrefix(rawKey),
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt,
        createdBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey,    // shown once — store it now
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
      },
    }, { status: 201 });
  } catch (e) {
    return v1Error(e);
  }
}

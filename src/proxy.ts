import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/api/rate-limit";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];

// Rate-limit windows
const LIMITS = {
  login:  { requests: 10,  windowMs: 60_000 },   // 10 req/min per IP
  api:    { requests: 120, windowMs: 60_000 },   // 120 req/min per IP
  v1:     { requests: 200, windowMs: 60_000 },   // 200 req/min per IP (API key clients)
} as const;

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimitResponse() {
  return NextResponse.json(
    { data: null, error: "Too many requests. Please slow down.", success: false },
    { status: 429 }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getIp(request);

  // ── Rate limiting ─────────────────────────────────────────────────────────
  // Skip cron routes — they're protected by CRON_SECRET, not IP rate limiting
  if (!pathname.startsWith("/api/cron")) {
    if (pathname.startsWith("/login")) {
      const { allowed } = rateLimit(`login:${ip}`, LIMITS.login.requests, LIMITS.login.windowMs);
      if (!allowed) return rateLimitResponse();
    } else if (pathname.startsWith("/api/v1/")) {
      const { allowed } = rateLimit(`v1:${ip}`, LIMITS.v1.requests, LIMITS.v1.windowMs);
      if (!allowed) return rateLimitResponse();
    } else if (pathname.startsWith("/api/")) {
      const { allowed } = rateLimit(`api:${ip}`, LIMITS.api.requests, LIMITS.api.windowMs);
      if (!allowed) return rateLimitResponse();
    }
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

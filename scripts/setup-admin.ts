/**
 * Run once to create the admin user in Supabase Auth + seed Company/UserProfile in Prisma.
 * Usage: npx tsx scripts/setup-admin.ts
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Credentials (change these before running) ─────────────────────────────────
const ADMIN_EMAIL = "admin@gulfahrm.com";
const ADMIN_PASSWORD = "Admin@12345";
const COMPANY_NAME = "Gulfa Dynamics";

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter } as never);

  try {
    // ── 1. Create (or fetch) Supabase Auth user ──────────────────────────────
    console.log(`\n🔐  Creating Supabase Auth user: ${ADMIN_EMAIL}`);

    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.users?.find((u) => u.email === ADMIN_EMAIL);

    let userId: string;

    if (existingUser) {
      console.log(`   ⚠  User already exists — reusing (id: ${existingUser.id})`);
      userId = existingUser.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(`Auth error: ${error.message}`);
      userId = data.user.id;
      console.log(`   ✓  Auth user created (id: ${userId})`);
    }

    // ── 2. Create Company ────────────────────────────────────────────────────
    console.log(`\n🏢  Creating company: ${COMPANY_NAME}`);

    let company = await prisma.company.findFirst({
      where: { name: COMPANY_NAME },
    });

    if (company) {
      console.log(`   ⚠  Company already exists — reusing (id: ${company.id})`);
    } else {
      company = await prisma.company.create({
        data: {
          name: COMPANY_NAME,
          country: "UAE",
          city: "Dubai",
        },
      });
      console.log(`   ✓  Company created (id: ${company.id})`);
    }

    // ── 3. Create UserProfile ────────────────────────────────────────────────
    console.log(`\n👤  Linking UserProfile`);

    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      console.log(`   ⚠  UserProfile already exists — skipping`);
    } else {
      await prisma.userProfile.create({
        data: {
          userId,
          companyId: company.id,
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
      console.log(`   ✓  UserProfile created`);
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Setup complete!

   URL:      http://localhost:3000
   Email:    ${ADMIN_EMAIL}
   Password: ${ADMIN_PASSWORD}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ ", e.message);
  process.exit(1);
});

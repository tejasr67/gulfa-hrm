import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const CATEGORIES = [
  { name: "Laptop",               icon: "laptop" },
  { name: "Desktop Computer",     icon: "monitor" },
  { name: "Mobile Phone",         icon: "smartphone" },
  { name: "Tablet",               icon: "tablet" },
  { name: "Printer",              icon: "printer" },
  { name: "Vehicle",              icon: "car" },
  { name: "Furniture",            icon: "armchair" },
  { name: "Office Equipment",     icon: "briefcase" },
  { name: "Networking Equipment", icon: "wifi" },
  { name: "Tools & Machinery",    icon: "wrench" },
  { name: "CCTV & Security",      icon: "camera" },
  { name: "Air Conditioner",      icon: "wind" },
  { name: "Kitchen Equipment",    icon: "utensils" },
  { name: "Software License",     icon: "key" },
  { name: "Other",                icon: "box" },
];

async function main() {
  console.log("Seeding asset categories…");
  let created = 0, skipped = 0;
  for (const cat of CATEGORIES) {
    const exists = await prisma.assetCategory.findFirst({
      where: { companyId: null, name: cat.name },
    });
    if (exists) { skipped++; continue; }
    await prisma.assetCategory.create({
      data: { companyId: null, name: cat.name, icon: cat.icon, isActive: true },
    });
    console.log(`  + ${cat.name}`);
    created++;
  }
  console.log(`\nDone — ${created} created, ${skipped} already existed.`);
}

main()
  .catch((e) => { console.error("Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Package,
  Home,
  Heart,
  AlertTriangle,
  TrendingUp,
  Bell,
  Settings,
  LayoutDashboard,
  Building2,
  ChevronLeft,
  ShieldCheck,
  BarChart3,
  Key,
  Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/stores/ui.store";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Attendance", href: "/attendance", icon: Clock },
  { label: "Leave", href: "/leave", icon: Calendar },
  { label: "Payroll", href: "/payroll", icon: DollarSign },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Assets", href: "/assets", icon: Package },
  { label: "Accommodation", href: "/accommodation", icon: Home },
  { label: "Uniforms", href: "/uniforms", icon: Shirt },
  { label: "Benefits", href: "/benefits", icon: Heart },
  { label: "Disciplinary", href: "/disciplinary", icon: AlertTriangle },
  { label: "Career", href: "/career", icon: TrendingUp },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
] as const;

const BOTTOM_ITEMS = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Integrations", href: "/settings/integrations", icon: Key },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r bg-card transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Building2 className="h-7 w-7 shrink-0 text-primary" />
        {!sidebarCollapsed && (
          <span className="ml-3 text-lg font-bold tracking-tight">
            Gulfa HRM
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t px-2 py-4">
        <ul className="space-y-1">
          {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebarCollapsed}
        className={cn(
          "absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm",
          sidebarCollapsed && "rotate-180"
        )}
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
    </aside>
  );
}

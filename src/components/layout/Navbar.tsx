"use client";

import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";

export function Navbar() {
  const { toggleSidebar } = useUIStore();
  const { session, clearSession } = useAuthStore();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearSession();
    router.push("/login");
  }

  const initials = session
    ? `${session.email.charAt(0).toUpperCase()}`
    : "U";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees, records..."
            className="w-72 pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent">
              <Avatar.Root className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <Avatar.Fallback className="text-sm font-semibold text-primary-foreground">
                  {initials}
                </Avatar.Fallback>
              </Avatar.Root>
              {session && (
                <span className="hidden text-sm font-medium md:block">
                  {session.email}
                </span>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-40 rounded-md border bg-popover p-1 shadow-md"
              align="end"
            >
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                Profile
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-accent"
                onClick={handleSignOut}
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

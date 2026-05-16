"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type Props = {
  firstName: string;
  lastName: string;
  photo?: string | null;
  size?: AvatarSize;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-20 w-20 text-2xl",
};

export function EmployeeAvatar({
  firstName,
  lastName,
  photo,
  size = "md",
}: Props) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const sizeClass = sizeClasses[size];

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={`${firstName} ${lastName}`}
        className={cn("rounded-full object-cover shrink-0", sizeClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 select-none",
        sizeClass
      )}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}

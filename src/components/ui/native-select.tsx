import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "rounded-md border border-input bg-background px-3 py-2 text-sm",
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  )
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };

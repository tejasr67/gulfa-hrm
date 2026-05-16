import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, showLabel = false, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div className={cn("flex items-center gap-2 w-full", className)} ref={ref} {...props}>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted flex-1">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${clampedValue}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-xs text-muted-foreground tabular-nums w-9 text-right shrink-0">
            {clampedValue}%
          </span>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };

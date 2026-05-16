"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type CompletenessSection = {
  name: string;
  score: number;
  maxScore: number;
};

type Props = {
  score: number;
  sections: CompletenessSection[];
};

function getScoreColor(score: number): string {
  if (score < 40) return "text-destructive";
  if (score < 70) return "text-amber-600";
  return "text-emerald-600";
}

export function ProfileCompleteness({ score, sections }: Props) {
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-semibold">
            Profile Completeness
          </CardTitle>
          <span
            className={cn("text-2xl font-bold tabular-nums leading-none", getScoreColor(clampedScore))}
          >
            {clampedScore}%
          </span>
        </div>
        <Progress value={clampedScore} className="mt-2" />
      </CardHeader>

      <CardContent className="pt-2">
        <ul className="space-y-2.5">
          {sections.map((section) => {
            const isComplete = section.score === section.maxScore;
            const sectionPercent =
              section.maxScore > 0
                ? Math.round((section.score / section.maxScore) * 100)
                : 0;

            return (
              <li key={section.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground truncate">
                      {section.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isComplete && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {section.score}/{section.maxScore}
                      </span>
                    </div>
                  </div>
                  <Progress value={sectionPercent} className="h-1.5" />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

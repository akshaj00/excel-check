import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";

export interface StatusStep {
  label: string;
  detail?: string | undefined;
  state: "done" | "pending" | "active";
}

export function ProcessingStatus({ steps }: { steps: StatusStep[] }) {
  const doneCount = steps.filter((s) => s.state === "done").length;
  const progress = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-sm font-semibold text-foreground">Progress</p>
        <p className="text-xs text-muted-foreground">
          {doneCount} of {steps.length} steps complete
        </p>
      </div>
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <CardContent className="px-5 py-4">
        <ol className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, idx) => (
            <li key={step.label} className="flex items-start gap-2.5 min-w-0">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  step.state === "done"
                    ? "bg-emerald-600 text-white"
                    : step.state === "active"
                      ? "bg-primary/10 text-primary ring-1 ring-primary/40"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step.state === "done" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : step.state === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  idx + 1
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-sm leading-tight ${
                    step.state === "pending"
                      ? "text-muted-foreground"
                      : "font-medium text-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {step.detail && (
                  <p
                    className="mt-0.5 truncate text-xs text-muted-foreground"
                    title={step.detail}
                  >
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

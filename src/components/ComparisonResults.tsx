import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2 } from "lucide-react";
import type { ComparisonResponse, ResultStatus } from "@/lib/comparison";

/**
 * Displays the comparison result returned by the backend.
 * The frontend does not interpret fields — it renders whatever
 * the backend returns, using status for visual indicators.
 */

const STATUS_STYLES: Record<string, string> = {
  matched: "bg-emerald-100 text-emerald-800 border-emerald-200",
  changed: "bg-red-100 text-red-800 border-red-200",
  missing: "bg-amber-100 text-amber-800 border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  matched: "Match",
  changed: "Changed",
  missing: "Missing",
};

function StatusBadge({ status }: { status: ResultStatus }) {
  const style =
    STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <Badge variant="outline" className={`capitalize ${style}`}>
      {label}
    </Badge>
  );
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

interface SummaryItemProps {
  label: string;
  value: number;
  tone?: string;
}

function SummaryItem({ label, value, tone }: SummaryItemProps) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export function ComparisonResults({ data }: { data: ComparisonResponse }) {
  const { summary, results } = data;
  const hasDifferences = results.some((r) => r.status !== "matched");

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Cross Verification Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryItem label="Total Checked" value={summary.total} />
            <SummaryItem
              label="Matched"
              value={summary.matched}
              tone="text-emerald-600"
            />
            <SummaryItem
              label="Changes"
              value={summary.changed}
              tone="text-red-600"
            />
            <SummaryItem
              label="Missing"
              value={summary.missing}
              tone="text-amber-600"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Changes Found</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 || !hasDifferences ? (
            <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-8">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-foreground">
                No differences found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Main File</TableHead>
                    <TableHead>Project File</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, index) => (
                    <TableRow key={`${row.field}-${index}`}>
                      <TableCell className="font-medium">{row.field}</TableCell>
                      <TableCell>{displayValue(row.main_value)}</TableCell>
                      <TableCell>{displayValue(row.project_value)}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

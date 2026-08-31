import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Info } from "lucide-react";
import type {
  ComparisonResponse,
  ComparisonResultRow,
  DateComparison,
  ResultStatus,
} from "@/lib/comparison";

/**
 * Renders whatever the comparison engine returns. No field names or
 * comparison rules are hardcoded here.
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

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
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

function ResultsTable({ rows }: { rows: ComparisonResultRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Main File</TableHead>
            <TableHead>Project Report</TableHead>
            <TableHead>Difference</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.field}-${index}`}>
              <TableCell className="font-medium">{row.field}</TableCell>
              <TableCell>{displayValue(row.mainValue)}</TableCell>
              <TableCell>{displayValue(row.reportValue)}</TableCell>
              <TableCell>{displayValue(row.difference)}</TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DateSection({ dateResult }: { dateResult: DateComparison }) {
  const rows = dateResult.results;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {dateResult.date}
        </h3>
        <span className="text-xs text-muted-foreground">
          Sheet {dateResult.sheet} · {dateResult.mainRecordCount} main records
        </span>
      </div>

      {dateResult.error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dateResult.error}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-6">
          <Info className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No comparison rules configured yet. Data is prepared and ready for
            comparison.
          </p>
        </div>
      ) : rows.every((r) => r.status === "matched") ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-6">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-medium text-foreground">
            No differences found
          </p>
        </div>
      ) : (
        <ResultsTable rows={rows} />
      )}
    </div>
  );
}

export function ComparisonResults({ data }: { data: ComparisonResponse }) {
  const { summary, dates, project } = data;
  const [activeDate, setActiveDate] = useState<string>(dates[0]?.date ?? "");
  const selected = dates.find((d) => d.date === activeDate) ?? dates[0];

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Cross Verification Results
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Project: <span className="font-medium text-foreground">{project}</span>
          </p>
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
          <CardTitle className="text-lg font-semibold">
            Results by Date
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {dates.map((d) => (
              <Button
                key={d.date}
                size="sm"
                variant={d.date === selected?.date ? "default" : "outline"}
                onClick={() => setActiveDate(d.date)}
              >
                {d.date}
              </Button>
            ))}
          </div>

          {selected && <DateSection dateResult={selected} />}
        </CardContent>
      </Card>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, FileDown, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  collectReportDates,
  downloadTemplate,
  type TemplateExportResult,
  type TemplateRowStatus,
} from "@/lib/templateExport";
import type { ProjectVerificationOutcome } from "@/lib/verification";

const STATUS_STYLE: Record<TemplateRowStatus, string> = {
  filled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mismatch: "bg-red-100 text-red-800 border-red-200",
  "no-report": "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<TemplateRowStatus, string> = {
  filled: "Filled",
  mismatch: "Blank – mismatch",
  "no-report": "Blank – no report",
};

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function TemplateDownloadCard({
  projects,
}: {
  projects: ProjectVerificationOutcome[];
}) {
  const dates = useMemo(() => collectReportDates(projects), [projects]);
  const [date, setDate] = useState<string>(dates[0] ?? "");
  const [isBuilding, setIsBuilding] = useState(false);
  const [result, setResult] = useState<TemplateExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDate(dates[0] ?? "");
    setResult(null);
  }, [dates]);

  if (dates.length === 0) return null;

  const handleDownload = async () => {
    setIsBuilding(true);
    setError(null);
    try {
      setResult(await downloadTemplate(projects, date));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the file.");
    } finally {
      setIsBuilding(false);
    }
  };

  const filledCount = result?.rows.filter((r) => r.status === "filled").length ?? 0;

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.04] to-card">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FileDown className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Download Daily Report</CardTitle>
            <p className="text-sm leading-snug text-muted-foreground">
              Exports the download template for the selected date. A project is
              filled only when every heading matches between the SharePoint file
              and its Daily Report; otherwise its row is left blank.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="template-date">Report date</Label>
            <Select
              value={date}
              onValueChange={(value) => {
                setDate(value);
                setResult(null);
              }}
            >
              <SelectTrigger id="template-date" className="w-full sm:w-48">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {dates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {formatDisplayDate(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleDownload}
            disabled={!date || isBuilding}
            className="cursor-pointer"
          >
            {isBuilding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Excel
          </Button>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Downloaded <span className="font-medium text-foreground">{result.fileName}</span>{" "}
              — {filledCount} of {result.rows.length} projects filled.
            </p>
            <ul className="grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-card text-sm">
              {result.rows.map((row) => (
                <li
                  key={row.project}
                  className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{row.project}</span>
                  <span className="flex flex-col items-start gap-1 sm:items-end">
                    <Badge variant="outline" className={STATUS_STYLE[row.status]}>
                      {STATUS_LABEL[row.status]}
                    </Badge>
                    {row.status === "mismatch" && row.reason && (
                      <span className="text-xs text-muted-foreground">{row.reason}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

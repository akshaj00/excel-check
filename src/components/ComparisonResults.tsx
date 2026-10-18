import { useState, useMemo, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Info, Settings, Calendar, RotateCcw } from "lucide-react";
import type {
  ComparisonResponse,
  ComparisonResultRow,
  DateComparison,
  ResultStatus,
} from "@/lib/comparison";
import type {
  DetectedReport,
  ProjectVerificationOutcome,
  VerificationOutcome,
} from "@/lib/verification";
import type { ProjectMatchMethod } from "@/lib/projectMatching";

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

export function StatusBadge({ status }: { status: ResultStatus }) {
  const style =
    STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <Badge variant="outline" className={`capitalize ${style}`}>
      {label}
    </Badge>
  );
}

export function MatchMethodBadge({ method }: { method?: ProjectMatchMethod }) {
  if (!method || method === "none") return null;
  return (
    <Badge
      variant="outline"
      className={
        method === "keyword"
          ? "border-blue-200 bg-blue-50 text-blue-800 text-[10px] px-1.5 py-0"
          : method === "exact"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0"
            : "border-violet-200 bg-violet-50 text-violet-800 text-[10px] px-1.5 py-0"
      }
    >
      {method === "keyword"
        ? "Keyword Match"
        : method === "exact"
          ? "Exact Match"
          : method === "code"
            ? "Code Match"
            : "Substring Match"}
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

export interface ProjectDateEntry {
  project: string;
  matchedProjectCode: string;
  matchMethod: ProjectMatchMethod;
  fileName?: string;
  sheet?: string;
  mainRecordCount?: number;
  error?: string;
  rows: ComparisonResultRow[];
}

function ResultsTable({
  entries,
  layout = "grouped",
}: {
  entries: ProjectDateEntry[];
  layout?: "grouped" | "repeat";
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[200px] font-semibold text-foreground">
              Project
            </TableHead>
            <TableHead className="font-semibold text-foreground">Field</TableHead>
            <TableHead className="font-semibold text-foreground">Main File</TableHead>
            <TableHead className="font-semibold text-foreground">Project Report</TableHead>
            <TableHead className="font-semibold text-foreground">Difference</TableHead>
            <TableHead className="font-semibold text-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, pIdx) => {
            const isLastProject = pIdx === entries.length - 1;
            const projectBorderClass = !isLastProject ? "border-b-2 border-border/80" : "";

            if (entry.rows.length === 0) {
              return (
                <TableRow
                  key={`${entry.matchedProjectCode || entry.project}-${pIdx}`}
                  className={projectBorderClass}
                >
                  <TableCell className="align-top font-medium bg-muted/10 border-r border-border py-3.5">
                    <div className="space-y-1">
                      <div className="font-bold text-foreground text-sm">
                        {entry.matchedProjectCode || entry.project}
                      </div>
                      {entry.project && entry.project !== entry.matchedProjectCode && (
                        <div className="text-xs text-muted-foreground">
                          {entry.project}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    colSpan={5}
                    className="py-4 text-xs text-amber-800 bg-amber-50/50 italic"
                  >
                    {entry.error || `No report data found for this date in ${entry.project}.`}
                  </TableCell>
                </TableRow>
              );
            }

            return entry.rows.map((row, rIdx) => {
              const isFirstRowOfProject = rIdx === 0;
              const isLastRowOfProject = rIdx === entry.rows.length - 1;
              const rowBorderClass = isLastRowOfProject ? projectBorderClass : "";

              return (
                <TableRow
                  key={`${entry.matchedProjectCode || entry.project}-${row.field}-${rIdx}`}
                  className={`${rowBorderClass} hover:bg-muted/30 transition-colors`}
                >
                  {layout === "grouped" ? (
                    isFirstRowOfProject ? (
                      <TableCell
                        rowSpan={entry.rows.length}
                        className="align-top font-medium bg-muted/10 border-r border-border py-3.5 w-[200px]"
                      >
                        <div className="space-y-1.5 sticky top-2">
                          <div className="font-bold text-foreground text-sm leading-tight">
                            {entry.matchedProjectCode || entry.project}
                          </div>
                          {entry.project && entry.project !== entry.matchedProjectCode && (
                            <div className="text-xs text-muted-foreground leading-tight">
                              {entry.project}
                            </div>
                          )}
                          <div className="pt-0.5">
                            <MatchMethodBadge method={entry.matchMethod} />
                          </div>
                          {entry.sheet && (
                            <div className="text-[11px] text-muted-foreground pt-0.5">
                              Sheet {entry.sheet}
                              {entry.mainRecordCount !== undefined && ` · ${entry.mainRecordCount} records`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    ) : null
                  ) : (
                    <TableCell className="font-semibold text-xs text-foreground py-3 border-r border-border/50 bg-muted/5">
                      <div>{entry.matchedProjectCode || entry.project}</div>
                    </TableCell>
                  )}

                  <TableCell className="font-medium py-3 text-sm">{row.field}</TableCell>
                  <TableCell className="py-3 text-sm">{displayValue(row.mainValue)}</TableCell>
                  <TableCell className="py-3 text-sm">{displayValue(row.reportValue)}</TableCell>
                  <TableCell className="py-3 text-sm">{displayValue(row.difference)}</TableCell>
                  <TableCell className="py-3">
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              );
            });
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export interface ComparisonResultsProps {
  outcome?: VerificationOutcome;
  data?: ComparisonResponse;
  detectedReports?: DetectedReport[];
  matchedProjectCode?: string;
  matchMethod?: ProjectMatchMethod;
  projects?: ProjectVerificationOutcome[];
}

export function ComparisonResults({
  outcome,
  data,
  detectedReports,
  matchedProjectCode,
  matchMethod,
  projects,
}: ComparisonResultsProps) {
  // Normalize into multi-project list
  const normalizedProjects: ProjectVerificationOutcome[] = useMemo(() => {
    if (projects && projects.length > 0) return projects;
    if (outcome?.projects && outcome.projects.length > 0) return outcome.projects;
    if (!data) return [];
    return [
      {
        fileName: "Project Report",
        project: data.project,
        matchedProjectCode: matchedProjectCode || data.project,
        matchMethod: matchMethod || "keyword",
        projectRowCount: 0,
        detectedReports: detectedReports || [],
        comparison: data,
      },
    ];
  }, [projects, outcome, data, matchedProjectCode, matchMethod, detectedReports]);

  // Collect all unique dates across all projects, sorted chronologically
  const sortedDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const p of normalizedProjects) {
      for (const d of p.comparison.dates) {
        if (d.date) dateSet.add(d.date);
      }
    }
    return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  }, [normalizedProjects]);

  const latestDate = sortedDates[sortedDates.length - 1] ?? "";

  // Active date selection (defaulting to the latest date)
  const [activeDate, setActiveDate] = useState<string>(() => latestDate);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tableLayout, setTableLayout] = useState<"grouped" | "repeat">("grouped");

  // Re-default when latest date changes
  useEffect(() => {
    if (latestDate && (!activeDate || !sortedDates.includes(activeDate))) {
      setActiveDate(latestDate);
    }
  }, [latestDate, sortedDates, activeDate]);

  const isLatestSelected = activeDate === latestDate;

  // Build active project entries for the selected date
  const activeProjectEntries = useMemo<ProjectDateEntry[]>(() => {
    return normalizedProjects.map((p) => {
      const dateComp = p.comparison.dates.find((d) => d.date === activeDate);
      return {
        project: p.project,
        matchedProjectCode: p.matchedProjectCode,
        matchMethod: p.matchMethod,
        fileName: p.fileName,
        sheet: dateComp?.sheet,
        mainRecordCount: dateComp?.mainRecordCount,
        error:
          dateComp?.error ||
          (dateComp ? undefined : `No report sheet found for date ${activeDate} in this project report.`),
        rows: dateComp?.results ?? [],
      };
    });
  }, [normalizedProjects, activeDate]);

  // Summary counts across all projects on active date
  const activeSummary = useMemo(() => {
    const allRows = activeProjectEntries.flatMap((e) => e.rows);
    return {
      total: allRows.length,
      matched: allRows.filter((r) => r.status === "matched").length,
      changed: allRows.filter((r) => r.status === "changed").length,
      missing: allRows.filter((r) => r.status === "missing").length,
    };
  }, [activeProjectEntries]);

  const allMatched =
    activeSummary.total > 0 && activeSummary.matched === activeSummary.total;

  return (
    <section className="space-y-6">
      {/* Top Card: Overview + Settings Option at the Top */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">
                  Cross Verification Results
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 text-xs font-medium"
                >
                  {normalizedProjects.length} {normalizedProjects.length === 1 ? "Project" : "Projects"}
                </Badge>
                {isLatestSelected && (
                  <Badge
                    variant="secondary"
                    className="border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800"
                  >
                    Latest Report
                  </Badge>
                )}
              </div>

              {/* All Matched Project pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {normalizedProjects.map((p) => (
                  <div
                    key={p.project}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs"
                  >
                    {p.matchedProjectCode ? (
                      <>
                        <span className="font-semibold text-foreground">
                          {p.matchedProjectCode}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Main</span>
                        <span className="text-muted-foreground">&#8596;</span>
                        <span className="text-foreground">{p.project}</span>
                        <span className="text-[10px] text-muted-foreground">Report</span>
                        <MatchMethodBadge method={p.matchMethod} />
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">{p.project}</span>
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-red-800 text-[10px]"
                        >
                          Not Matched
                        </Badge>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground pt-0.5">
                <span>
                  Active Date:{" "}
                  <strong className="font-medium text-foreground">
                    {activeDate}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  {activeProjectEntries.filter((e) => e.rows.length > 0).length} of{" "}
                  {normalizedProjects.length} projects have reports on this date
                </span>
              </div>
            </div>

            {/* Settings Option & Quick Date Selector at the Top */}
            <div className="flex items-center gap-2 self-start">
              <Select value={activeDate} onValueChange={setActiveDate}>
                <SelectTrigger className="h-9 w-[190px] text-xs">
                  <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent align="end">
                  {[...sortedDates].reverse().map((d) => (
                    <SelectItem
                      key={d}
                      value={d}
                      className="cursor-pointer text-xs"
                    >
                      <span className="font-medium">{d}</span>
                      {d === latestDate && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1 py-0.2 text-[10px] font-semibold text-emerald-800">
                          Latest
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Settings Dialog Option */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Verification Settings
                    </DialogTitle>
                    <DialogDescription>
                      Change the active report date, layout preferences, or review project sheets.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    {/* Active Date Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Active Report Date
                      </Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={activeDate}
                          onValueChange={(val) => setActiveDate(val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose report date" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...sortedDates].reverse().map((d) => (
                              <SelectItem key={d} value={d}>
                                <span>{d}</span>
                                {d === latestDate && (
                                  <span className="ml-2 text-xs font-semibold text-emerald-600">
                                    (Latest)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {latestDate && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveDate(latestDate)}
                            disabled={activeDate === latestDate}
                            className="whitespace-nowrap"
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Latest
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The tool defaults to the latest report date found across your project reports.
                      </p>
                    </div>

                    <Separator />

                    {/* Table Layout Toggle */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Project Column Layout
                      </Label>
                      <Select
                        value={tableLayout}
                        onValueChange={(v: "grouped" | "repeat") => setTableLayout(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grouped">
                            Grouped (Merged Project Rows)
                          </SelectItem>
                          <SelectItem value="repeat">
                            Repeat Project Name on Every Row
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose whether the left Project column merges cells per project or repeats the name on every row.
                      </p>
                    </div>

                    <Separator />

                    {/* Detected Projects Summary */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Verified Projects
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {normalizedProjects.length} total projects
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="py-2 text-xs">Project</TableHead>
                              <TableHead className="py-2 text-xs">Main Match</TableHead>
                              <TableHead className="py-2 text-xs">Method</TableHead>
                              <TableHead className="py-2 text-xs text-right">Dates</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {normalizedProjects.map((p) => (
                              <TableRow key={p.project}>
                                <TableCell className="py-2 text-xs font-medium">
                                  {p.project}
                                </TableCell>
                                <TableCell className="py-2 text-xs">
                                  {p.matchedProjectCode || "—"}
                                </TableCell>
                                <TableCell className="py-2 text-xs">
                                  <MatchMethodBadge method={p.matchMethod} />
                                </TableCell>
                                <TableCell className="py-2 text-xs text-right font-medium">
                                  {p.comparison.dates.length}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => setIsSettingsOpen(false)}>Done</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryItem label="Total Checked" value={activeSummary.total} />
            <SummaryItem
              label="Matched"
              value={activeSummary.matched}
              tone="text-emerald-600"
            />
            <SummaryItem
              label="Changes"
              value={activeSummary.changed}
              tone="text-red-600"
            />
            <SummaryItem
              label="Missing"
              value={activeSummary.missing}
              tone="text-amber-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Results for the Active Date */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Report Date: {activeDate}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing comparison across {activeProjectEntries.length} project {activeProjectEntries.length === 1 ? "report" : "reports"}
              </p>
            </div>
            {isLatestSelected ? (
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs"
              >
                Latest
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-7 cursor-pointer"
                onClick={() => latestDate && setActiveDate(latestDate)}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Jump to Latest ({latestDate})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {allMatched && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="font-medium">
                All {activeSummary.total} fields matched across {activeProjectEntries.length}{" "}
                {activeProjectEntries.length === 1 ? "project" : "projects"} — no differences found
              </p>
            </div>
          )}

          <ResultsTable entries={activeProjectEntries} layout={tableLayout} />
        </CardContent>
      </Card>
    </section>
  );
}

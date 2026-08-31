import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DetectedReport } from "@/lib/verification";

export function DetectedReports({
  project,
  reports,
}: {
  project: string;
  reports: DetectedReport[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Detected Daily Reports
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Detected Project:{" "}
          <span className="font-medium text-foreground">{project}</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Report Sheet</TableHead>
                <TableHead className="text-right">Main File Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={`${report.sheet}-${report.date}`}>
                  <TableCell className="font-medium">{report.date}</TableCell>
                  <TableCell>{report.sheet}</TableCell>
                  <TableCell
                    className={`text-right ${
                      report.mainRecordCount === 0
                        ? "text-amber-600"
                        : "text-foreground"
                    }`}
                  >
                    {report.mainRecordCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

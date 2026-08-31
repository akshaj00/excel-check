import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, FileSpreadsheet, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUploadCard } from "@/components/FileUploadCard";
import { ComparisonResults } from "@/components/ComparisonResults";
import { DetectedReports } from "@/components/DetectedReports";
import {
  ProcessingStatus,
  type StatusStep,
} from "@/components/ProcessingStatus";
import {
  runVerification,
  VerificationError,
  type VerificationOutcome,
} from "@/lib/verification";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Excel Cross Verification Tool" },
      {
        name: "description",
        content:
          "Upload a main Excel file and a project daily report to cross-verify project data directly in your browser.",
      },
      { property: "og:title", content: "Excel Cross Verification Tool" },
      {
        property: "og:description",
        content:
          "Cross-check daily project reports against the main project database — entirely in the browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bothFilesSelected = mainFile !== null && projectFile !== null;

  const handleInvalidFile = () => {
    setError("Invalid file type. Please upload a .xlsx or .xls Excel file.");
  };

  const handleVerify = async () => {
    if (!mainFile && !projectFile) {
      setError("Please upload the Main Excel file and the Project Report Excel file.");
      return;
    }
    if (!mainFile) {
      setError("Please upload the Main Excel file.");
      return;
    }
    if (!projectFile) {
      setError("Please upload the Project Report Excel file.");
      return;
    }

    setError(null);
    setOutcome(null);
    setIsVerifying(true);
    try {
      const result = await runVerification(mainFile, projectFile);
      setOutcome(result);
    } catch (err) {
      setError(
        err instanceof VerificationError || err instanceof Error
          ? err.message
          : "Unable to process the files. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setMainFile(null);
    setProjectFile(null);
    setOutcome(null);
    setError(null);
    setIsVerifying(false);
  };

  const steps: StatusStep[] = [
    {
      label: "Main Excel uploaded",
      detail: mainFile?.name,
      state: mainFile ? "done" : "pending",
    },
    {
      label: "Project Report uploaded",
      detail: projectFile?.name,
      state: projectFile ? "done" : "pending",
    },
    {
      label: "Project identified",
      detail: outcome?.project,
      state: outcome ? "done" : isVerifying ? "active" : "pending",
    },
    {
      label: outcome
        ? `${outcome.detectedReports.length} report dates detected`
        : "Report dates detected",
      state: outcome ? "done" : isVerifying ? "active" : "pending",
    },
    {
      label: "Main Excel records filtered",
      detail: outcome
        ? `${outcome.projectRowCount} of ${outcome.mainRowCount} records`
        : undefined,
      state: outcome ? "done" : isVerifying ? "active" : "pending",
    },
    {
      label: "Ready for comparison",
      state: outcome ? "done" : "pending",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Excel Cross Verification
            </h1>
            <p className="text-sm text-muted-foreground">
              Compare daily project reports against the main project database
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <FileUploadCard
          title="Main Excel File"
          description="Upload the Excel file containing data for all projects."
          file={mainFile}
          onFileChange={(file) => {
            setMainFile(file);
            setError(null);
          }}
          onInvalidFile={handleInvalidFile}
          disabled={isVerifying}
        />

        <FileUploadCard
          title="Project Daily Report"
          description="Upload the project's daily report workbook. The project and dates are detected automatically."
          file={projectFile}
          onFileChange={(file) => {
            setProjectFile(file);
            setError(null);
          }}
          onInvalidFile={handleInvalidFile}
          disabled={isVerifying}
        />

        <ProcessingStatus steps={steps} />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription className="mt-1 space-y-3">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  handleVerify();
                }}
                disabled={isVerifying || !bothFilesSelected}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!bothFilesSelected || isVerifying}
            onClick={handleVerify}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cross verifying...
              </>
            ) : (
              "Start Cross Verification"
            )}
          </Button>

          {outcome && !isVerifying && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              New Verification
            </Button>
          )}
        </div>

        {outcome && !isVerifying && (
          <>
            <DetectedReports
              project={outcome.project}
              reports={outcome.detectedReports}
            />
            <ComparisonResults data={outcome.comparison} />
          </>
        )}
      </main>
    </div>
  );
}

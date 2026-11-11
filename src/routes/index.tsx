import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  Cloud,
  Loader2,
  Lock,
  RotateCcw,
  ScanSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUploadCard } from "@/components/FileUploadCard";
import { ComparisonResults } from "@/components/ComparisonResults";
import { TemplateDownloadCard } from "@/components/TemplateDownloadCard";
import {
  ProcessingStatus,
  type StatusStep,
} from "@/components/ProcessingStatus";
import {
  runVerification,
  VerificationError,
  type VerificationOutcome,
} from "@/lib/verification";

const APP_NAME = "DocTally";
const APP_TAGLINE = "Document Control Transmittal Integrity & Reconciliation Engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — ${APP_TAGLINE}` },
      {
        name: "description",
        content:
          "Upload the SharePoint master file and project daily reports to reconcile document control figures directly in your browser.",
      },
      { property: "og:title", content: APP_NAME },
      {
        property: "og:description",
        content:
          "Reconcile document controller daily reports against the SharePoint master file — entirely in the browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bothFilesSelected = mainFile !== null && projectFiles.length > 0;

  const handleInvalidFile = () => {
    setError("Invalid file type. Please upload a .xlsx or .xls Excel file.");
  };

  const handleVerify = async () => {
    if (!mainFile && projectFiles.length === 0) {
      setError(
        "Please upload the SharePoint master file and at least one Project Report file.",
      );
      return;
    }
    if (!mainFile) {
      setError("Please upload the SharePoint master file.");
      return;
    }
    if (projectFiles.length === 0) {
      setError("Please upload at least one Project Report Excel file.");
      return;
    }

    setError(null);
    setOutcome(null);
    setIsVerifying(true);
    try {
      const result = await runVerification(mainFile, projectFiles);
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
    setProjectFiles([]);
    setOutcome(null);
    setError(null);
    setIsVerifying(false);
  };

  const steps: StatusStep[] = [
    {
      label: "SharePoint master file uploaded",
      detail: mainFile?.name,
      state: mainFile ? "done" : "pending",
    },
    {
      label: "Project Reports uploaded",
      detail:
        projectFiles.length > 0
          ? `${projectFiles.length} file${projectFiles.length > 1 ? "s" : ""} selected`
          : undefined,
      state: projectFiles.length > 0 ? "done" : "pending",
    },
    {
      label: "Projects identified",
      detail: outcome?.projects
        ? outcome.projects
            .map((p) => p.matchedProjectCode || p.project)
            .join(", ")
        : outcome?.project,
      state: outcome ? "done" : isVerifying ? "active" : "pending",
    },
    {
      label: outcome
        ? `${outcome.detectedReports.length} report dates detected`
        : "Report dates detected",
      state: outcome ? "done" : isVerifying ? "active" : "pending",
    },
    {
      label: "SharePoint master records filtered",
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

  const verifyLabel = `Start Cross Verification${projectFiles.length > 1 ? ` (${projectFiles.length} reports)` : ""}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/[0.06] via-muted/30 to-muted/30">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ScanSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-base font-bold tracking-tight text-foreground">
                {APP_NAME}
              </p>
              <p className="truncate text-xs text-muted-foreground">{APP_TAGLINE}</p>
            </div>
          </div>
          {outcome && !isVerifying && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="cursor-pointer"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              New Verification
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-4 md:grid-cols-2">
          <FileUploadCard
            step={1}
            icon={Cloud}
            title="SharePoint Master File"
            description="The SharePoint master file containing data for all projects."
            file={mainFile}
            onFileChange={(file) => {
              setMainFile(file);
              setError(null);
            }}
            onInvalidFile={handleInvalidFile}
            disabled={isVerifying}
          />

          <FileUploadCard
            step={2}
            icon={ClipboardList}
            title="Project Daily Reports"
            description="One or more daily report workbooks. Projects and dates are detected automatically."
            multiple={true}
            files={projectFiles}
            onFilesChange={(files) => {
              setProjectFiles(files);
              setError(null);
            }}
            onInvalidFile={handleInvalidFile}
            disabled={isVerifying}
          />
        </div>

        <ProcessingStatus steps={steps} />

        {error && (
          <Alert variant="destructive" className="bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription className="mt-1 space-y-3">
              <p className="whitespace-pre-line">{error}</p>
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

        <div className="flex flex-col items-stretch gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Files are processed locally in your browser and never uploaded.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {outcome && !isVerifying && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="cursor-pointer"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                New Verification
              </Button>
            )}
            <Button
              size="lg"
              className="cursor-pointer shadow-sm"
              disabled={!bothFilesSelected || isVerifying}
              onClick={handleVerify}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cross verifying {projectFiles.length} project{" "}
                  {projectFiles.length === 1 ? "report" : "reports"}...
                </>
              ) : (
                <>
                  <ScanSearch className="mr-2 h-4 w-4" />
                  {verifyLabel}
                </>
              )}
            </Button>
          </div>
        </div>

        {outcome && !isVerifying && (
          <TemplateDownloadCard projects={outcome.projects} />
        )}

        {outcome && !isVerifying && (
          <ComparisonResults
            outcome={outcome}
            projects={outcome.projects}
            data={outcome.comparison}
            detectedReports={outcome.detectedReports}
            matchedProjectCode={outcome.matchedProjectCode}
            matchMethod={outcome.matchMethod}
          />
        )}
      </main>

      <footer className="border-t border-border/70 py-6">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground sm:px-6">
          {APP_NAME} · {APP_TAGLINE}
        </p>
      </footer>
    </div>
  );
}

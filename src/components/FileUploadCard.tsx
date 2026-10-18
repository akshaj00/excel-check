import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isValidExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

interface FileUploadCardProps {
  title: string;
  description: string;
  file?: File | null;
  files?: File[];
  multiple?: boolean;
  onFileChange?: (file: File | null) => void;
  onFilesChange?: (files: File[]) => void;
  onInvalidFile: () => void;
  disabled?: boolean;
}

export function FileUploadCard({
  title,
  description,
  file,
  files = [],
  multiple = false,
  onFileChange,
  onFilesChange,
  onInvalidFile,
  disabled,
}: FileUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const fileArray = Array.from(incoming);
      const validFiles = fileArray.filter(isValidExcelFile);

      if (validFiles.length < fileArray.length) {
        onInvalidFile();
      }

      if (validFiles.length === 0) return;

      if (multiple && onFilesChange) {
        // Merge without duplicate file names + sizes
        const existingKeys = new Set(files.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
        const newFiles = validFiles.filter(
          (f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`),
        );
        onFilesChange([...files, ...newFiles]);
      } else if (onFileChange) {
        onFileChange(validFiles[0] ?? null);
      }
    },
    [files, multiple, onFileChange, onFilesChange, onInvalidFile],
  );

  const handleRemoveFile = (indexToRemove: number) => {
    if (!onFilesChange) return;
    onFilesChange(files.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {multiple && files.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {files.length} {files.length === 1 ? "report" : "reports"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {multiple ? (
          files.length > 0 ? (
            <div className="space-y-2">
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">
                          {f.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatFileSize(f.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${f.name}`}
                      disabled={disabled}
                      onClick={() => handleRemoveFile(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs cursor-pointer"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                >
                  + Add More Reports
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                  disabled={disabled}
                  onClick={() => onFilesChange?.([])}
                >
                  Clear All
                </Button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Upload ${title}`}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-accent"
                  : "border-input hover:border-primary/60 hover:bg-muted/30"
              }`}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your project report files here (you can select multiple), or
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Browse Files
              </Button>
              <p className="text-xs text-muted-foreground">
                Upload one or multiple .xlsx / .xls files
              </p>
            </div>
          )
        ) : file ? (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${title}`}
              disabled={disabled}
              onClick={() => onFileChange?.(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Upload ${title}`}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-accent"
                : "border-input hover:border-primary/60 hover:bg-muted/30"
            }`}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag and drop your Excel file here, or
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Browse Files
            </Button>
            <p className="text-xs text-muted-foreground">
              Accepted formats: .xlsx, .xls
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

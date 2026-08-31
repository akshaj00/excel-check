/**
 * Backend API integration for Excel cross-verification.
 *
 * This module is intentionally isolated: when the backend endpoint or
 * response shape changes, only this file needs to be updated.
 */

export type ResultStatus = "matched" | "changed" | "missing" | (string & {});

export interface ComparisonResultRow {
  field: string;
  main_value: string | number | null;
  project_value: string | number | null;
  status: ResultStatus;
}

export interface ComparisonSummary {
  total: number;
  matched: number;
  changed: number;
  missing: number;
}

export interface ComparisonResponse {
  summary: ComparisonSummary;
  results: ComparisonResultRow[];
}

const API_ENDPOINT: string =
  import.meta.env["VITE_COMPARE_API_URL"] ?? "/api/compare";

/**
 * Sends both Excel files to the backend in a single multipart request.
 *
 * Expected backend contract (subject to change when the backend is built):
 *   POST {API_ENDPOINT} with form fields `main_file` and `project_file`
 *   -> returns ComparisonResponse JSON
 */
export async function compareFiles(
  mainFile: File,
  projectFile: File,
): Promise<ComparisonResponse> {
  const formData = new FormData();
  formData.append("main_file", mainFile);
  formData.append("project_file", projectFile);

  let response: Response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Unable to reach the server. Please check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new Error(
      "Unable to process the files. Please try again.",
    );
  }

  let data: ComparisonResponse;
  try {
    data = (await response.json()) as ComparisonResponse;
  } catch {
    throw new Error("The server returned an unexpected response.");
  }

  if (!data || !data.summary || !Array.isArray(data.results)) {
    throw new Error("The server returned an unexpected response.");
  }

  return data;
}

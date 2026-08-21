import * as FileSystem from "expo-file-system/legacy";
import { extractText } from "expo-pdf-text-extract";

import { apiFetch, BASE_URL } from "./client";

// ── AI Generation ────────────────────────────────────────────────────────

export interface AppConfig {
  featureFlags: {
    maintenanceMode: boolean;
    disableAI: boolean;
    disableBattles: boolean;
  };
  aiConfig: {
    geminiKey: string;
    modelUrl: string;
    promptTemplate: string;
    promptTemplateRu?: string;
    promptTemplateVisual?: string;
    chunkSize: number;
    maxChunks: number;
    maxOutputTokens: number;
    temperature: number;
    generationTimeoutMs: number;
    concurrencyLimit?: number;
    maxDailyGenerations?: number;
    generationRanges: Array<{ max: number; minF: string; expF: string }>;
  };
  fileLimits: {
    pdfExtractThresholdMB: number;
    pptMaxMB: number;
  };
  appLinks: {
    shareBaseUrl: string;
    playStoreUrl: string;
    downloadUrl?: string;
    tutorialUrl: string;
  };
}

// ── App Updates ────────────────────────────────────────────────────────

export interface VersionConfig {
  latestVersion: string;
  minimumVersion: string;
  updateTitle?: string;
  updateMessage?: string;
  updateButtonText?: string;
  updatePromptScheduleDays?: number[];
}

/**
 * Fetches the Gemini API key and prompt from the backend to securely use on the client.
 */
/**
 * Fetches the gemini key directly (deprecated/legacy).
 */
export async function fetchGeminiKey(lang?: string): Promise<{ key: string | null; prompt: string | null; promptRu?: string | null; error: string | null }> {
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  const { data, error } = await apiFetch<{ key: string; prompt: string; promptRu?: string }>("/api/gemini-config" + query);
  return { key: data?.key ?? null, prompt: data?.prompt ?? null, promptRu: data?.promptRu ?? null, error };
}

export async function fetchAppConfig(): Promise<{ config: AppConfig | null; error: string | null }> {
  const { data, error } = await apiFetch<AppConfig>("/api/app-config");
  return { config: data ?? null, error };
}

/**
 * Fetches the version configuration to determine if an update is required.
 */
export async function fetchVersionConfig(): Promise<{ config: VersionConfig | null; error: string | null }> {
  const { data, error } = await apiFetch<VersionConfig>("/api/version-config");
  return { config: data ?? null, error };
}

// ── AI Generation Rate Limiting ────────────────────────────────────────────
/**
 * Checks the user's daily AI generation quota and increments if within limit.
 * Returns { allowed, used, limit }.
 * Fails open — if the server is unreachable, allows generation.
 */
export async function checkAiDailyLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { allowed: true, used: 0, limit: 0 };
    return await res.json();
  } catch {
    // Fail open — don't block generation when the check can't reach the server
    return { allowed: true, used: 0, limit: 0 };
  }
}

export async function parsePdfFromBackend(fileUri: string, fileName: string, fileSize: number = 0, extractThresholdMB: number): Promise<{ text: string; isVisual?: boolean; error?: string }> {
  try {
    if (fileSize > 0 && fileSize < extractThresholdMB * 1024 * 1024) {
      try {
        const uploadResult = await FileSystem.uploadAsync(`${BASE_URL}/api/parse-pdf`, fileUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
        });
        
        if (uploadResult.status === 200) {
          const data = JSON.parse(uploadResult.body);
          if (data.text) {
            return { text: data.text };
          }
        }
      } catch (backendErr) {
        console.log("[parsePdfFromBackend] Backend parsing failed, falling back to local...", backendErr);
      }
    }

    const text = await extractText(fileUri);
    if (!text || text.trim() === "") {
      // No text extracted — likely a scanned/image-only PDF.
      // Signal the caller to use visual mode (send file directly to Gemini).
      console.log("[parsePdfFromBackend] No text extracted — flagging as visual PDF");
      return { text: "", isVisual: true };
    }
    return { text };
  } catch (err: any) {
    let errMsg = err?.message || "Local PDF parsing failed";
    return { text: "", error: `Failed to extract text locally: ${errMsg}` };
  }
}

export async function parsePptFromBackend(fileUri: string, fileName: string): Promise<{ text: string; isVisual?: boolean; error?: string }> {
  try {
    const uploadResult = await FileSystem.uploadAsync(`${BASE_URL}/api/parse-ppt`, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
    });

    if (uploadResult.status !== 200) {
      let msg = uploadResult.body;
      try {
        const parsed = JSON.parse(uploadResult.body);
        if (parsed.error) msg = parsed.error;
      } catch (e) {}
      if (uploadResult.status === 413 || msg.includes("413") || msg.toLowerCase().includes("payload_too_large") || msg.toLowerCase().includes("request entity too large")) {
        return { text: "", error: "PPT upload limit is 4.5 MB. Try uploading as a PDF for larger files." };
      }
      if (msg.includes("OfficeParser currently supports")) {
        return { text: "", error: "Unsupported file format. Please upload a modern Office file (.docx, .pptx) or PDF." };
      }
      return { text: "", error: `Server error: ${msg}` };
    }
    
    const data = JSON.parse(uploadResult.body);
    if (data.error) return { text: "", error: data.error };
    
    const textString = typeof data.text === 'string' ? data.text : String(data.text || "");
    if (!textString || textString.trim() === "") {
      // No text extracted — likely an image-only PPTX.
      // Signal the caller to use visual mode (send file directly to Gemini).
      console.log("[parsePptFromBackend] No text extracted — flagging as visual PPTX");
      return { text: "", isVisual: true };
    }
    
    return { text: textString };
  } catch (err: any) {
    let errMsg = err?.message || "Upload failed";
    if (errMsg.includes(BASE_URL) || errMsg.includes("scorrapp") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed")) {
      errMsg = "Network error: Please check your internet connection.";
    }
    return { text: "", error: errMsg };
  }
}

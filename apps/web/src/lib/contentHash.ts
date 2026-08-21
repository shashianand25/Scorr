export const AI_GENERATION_VERSION = "v1";

/**
 * Conservatively normalizes document text:
 * - Unicode normalization (NFC)
 * - Standardizes CRLF / CR to LF
 * - Collapses repeated horizontal whitespace (spaces/tabs) to a single space
 * - Collapses 3+ consecutive newlines to 2 newlines (preserves paragraph structure)
 * - Trims leading/trailing whitespace
 */
export function normalizeDocumentText(rawText: string): string {
  if (!rawText) return "";
  return rawText
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Computes a SHA-256 cryptographic hash of the normalized document text with language and generation version.
 * Formula: `${normalizedText}|lang:${lang}|gen:${AI_GENERATION_VERSION}`
 * Supports browser Web Crypto and Node environments.
 */
export async function computeContentHash(rawText: string, lang: string = "en"): Promise<string> {
  const normalized = normalizeDocumentText(rawText);
  const hashInput = `${normalized}|lang:${(lang || "en").toLowerCase()}|gen:${AI_GENERATION_VERSION}`;

  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  try {
    const nodeCrypto = await import("crypto");
    return nodeCrypto.createHash("sha256").update(hashInput, "utf8").digest("hex");
  } catch {
    return "";
  }
}

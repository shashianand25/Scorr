export function getUserErrorMessage(error: any): string {
  const msg = typeof error === 'string' ? error : (error?.message ?? String(error));
  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes("network") || lowerMsg.includes("unknownhost") || lowerMsg.includes("internet")) {
    return "Please check your internet connection and try again.";
  }

  if (lowerMsg.includes("permission") || lowerMsg.includes("access denied")) {
    return "Permission denied. Please allow access and try again.";
  }

  if (lowerMsg.includes("pdf") || lowerMsg.includes("scanned") || lowerMsg.includes("extract text")) {
    return "Couldn't open this PDF. It may be corrupted, unsupported, or contain scanned/image-only pages.";
  }

  if (lowerMsg.includes("document") || lowerMsg.includes("file picker") || lowerMsg.includes("file not found")) {
    return "Couldn't open the selected file. It might be corrupted or missing.";
  }

  if (lowerMsg.includes("firebase") || lowerMsg.includes("auth/")) {
    return "Unable to connect to your account right now. Please try again.";
  }

  if (lowerMsg.includes("ppt upload limit") || lowerMsg.includes("payload_too_large") || lowerMsg.includes("413")) {
    return "PPT upload limit is 4.5 MB. Try uploading as a PDF for larger files.";
  }

  return `Something went wrong. Please try again. (${msg})`;
}

export function getUserErrorMessage(error: any): string {
  const msg = typeof error === 'string' ? error : (error?.message ?? String(error));
  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes("network") || lowerMsg.includes("unknownhost") || lowerMsg.includes("internet")) {
    return "Please check your internet connection and try again.";
  }

  if (lowerMsg.includes("permission") || lowerMsg.includes("access denied")) {
    return "Permission denied. Please allow access and try again.";
  }

  if (lowerMsg.includes("document") || lowerMsg.includes("file picker") || lowerMsg.includes("file not found")) {
    return "Couldn't open the selected file. It might be corrupted or missing.";
  }

  if (lowerMsg.includes("firebase") || lowerMsg.includes("auth/")) {
    return "Unable to connect to your account right now. Please try again.";
  }

  if (lowerMsg.includes("ppt upload limit") || lowerMsg.includes("payload_too_large") || lowerMsg.includes("413")) {
    return "PPT upload limit 4.5 mb, try uploading pdf for a larger size";
  }

  return `Something went wrong. Please try again. (${msg})`;
}

// ==============================================================================
// Scorr Web - Input Validation & Sanitization
// ==============================================================================

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function sanitizeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validateImportText(text: string): { valid: boolean; reason?: string } {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, reason: 'Import text cannot be empty' };
  }
  if (text.length > 500000) {
    return { valid: false, reason: 'File content exceeds maximum allowed size' };
  }
  return { valid: true };
}

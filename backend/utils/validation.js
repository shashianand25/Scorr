// ==============================================================================
// Scorr Backend - Input Validation & Sanitization Middleware
// ==============================================================================

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

function isValidBattleRoomCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
}

function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\0/g, '').trim();
}

function validateFeedbackPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a valid JSON object'] };
  }
  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    errors.push('Feedback message is required');
  }
  if (body.email && !isValidEmail(body.email)) {
    errors.push('Invalid contact email format');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  isValidEmail,
  isValidBattleRoomCode,
  sanitizeText,
  validateFeedbackPayload,
};

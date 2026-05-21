/**
 * Escape HTML special characters to prevent attribute breakout
 * and XSS in email/HTML rendering contexts.
 * Used in all email templates for user-supplied or DB-stored strings.
 * Ampersand must be replaced first to avoid double-escaping.
 */
export function escapeHtml(input) {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// HTML helpers for Live Tracking map markers / popups
// client/src/features/Livetracking/utils/html.ts
// ============================================================

/** Escape text for interpolation into an HTML string (map markers / popups) */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

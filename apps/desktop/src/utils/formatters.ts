/**
 * Centralized formatting utilities for desktop app.
 */

/**
 * Format seconds into MM:SS format.
 * Examples: 75 -> "01:15", 3600 -> "60:00"
 */
export function formatTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

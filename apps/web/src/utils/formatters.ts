/**
 * Centralized formatting utilities for dates, times, and domain metadata.
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

/**
 * Format ISO date string or Date object into localized Russian date (DD.MM.YYYY).
 * Handles invalid or missing dates gracefully.
 */
export function formatDate(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU');
  } catch {
    return '—';
  }
}

/**
 * Format ISO date string or Date object into localized Russian date and time (DD.MM.YYYY, HH:MM).
 */
export function formatDateTime(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Format duration in minutes and seconds in Russian ("X мин Y сек").
 */
export function formatDuration(secs?: number): string {
  const s = Math.max(0, Math.floor(secs || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m} мин ${rem} сек`;
}

/**
 * Format date string with exact time ("DD.MM.YYYY в HH:MM:SS").
 */
export function formatExactTime(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString('ru-RU');
    const time = d.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${date} в ${time}`;
  } catch {
    return '—';
  }
}

/**
 * Metadata mapping for supervision marker categories.
 */
export interface CategoryMeta {
  icon: string;
  label: string;
  badgeClass: string;
}

export function getCategoryMeta(category: string): CategoryMeta {
  switch (category) {
    case 'intervention':
      return {
        icon: '⚡',
        label: 'Техника / Интервенция',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
      };
    case 'emotion':
      return {
        icon: '💭',
        label: 'Эмоция / Маркер',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    case 'homework':
      return {
        icon: '📋',
        label: 'Домашнее задание',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'observation':
    default:
      return {
        icon: '👁',
        label: 'Наблюдение терапевта',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      };
  }
}

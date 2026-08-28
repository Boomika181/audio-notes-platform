import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips mojibake corrupted Unicode strings (e.g. â€“ from mis-decoded en-dashes).
 */
export function cleanMojibake(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/â€“/g, ' — ')
    .replace(/â€”/g, ' — ')
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\x9d/g, '"')
    .replace(/â€/g, '"')
    .replace(/\u2013|\u2014/g, ' — ')
    .replace(/\s*—\s*/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats recording titles into clean, professional, readable strings.
 */
export function formatDisplayTitle(
  title: string | null | undefined,
  fileName: string | null | undefined,
  createdAt?: string
): string {
  const raw = title || fileName || (createdAt ? `RECORDING — ${formatDisplayDate(createdAt)}` : 'AUDIO RECORDING');
  let clean = cleanMojibake(raw);

  // Match common macOS screen recording names like "Screen Recording 2026-08-28 at 7.49.04 — PM.mp3"
  const screenRecMatch = clean.match(/Screen\s*Recording\s*(\d{4})-(\d{2})-(\d{2})\s*at\s*(\d{1,2})[.:](\d{2})[.:](\d{2})\s*[-—\s]*([AaPp][Mm])/i);
  if (screenRecMatch) {
    const [, year, month, day, hour, min, , ampm] = screenRecMatch;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `SCREEN RECORDING — ${monthStr} ${day}, ${year} · ${hour}:${min} ${ampm.toUpperCase()}`;
  }

  // Remove common audio file extensions
  clean = clean.replace(/\.(mp3|wav|m4a|aac|ogg|webm)$/i, '');

  return clean.toUpperCase();
}

/**
 * Standardizes dates into clean uppercase strings e.g. "AUG 28, 2026 · 7:49 PM"
 */
export function formatDisplayDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString.toUpperCase();
    
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }).format(d).toUpperCase();

    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d).toUpperCase();

    return `${datePart} · ${timePart}`;
  } catch {
    return dateString.toUpperCase();
  }
}


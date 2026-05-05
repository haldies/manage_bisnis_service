import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: any, currency = "IDR"): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(val);
}


export function formatDate(date: string | number | Date): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch (e) {
    return "-";
  }
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function truncate(str: string, length = 20): string {
  return str.length > length ? `${str.slice(0, length)}...` : str;
}

/**
 * Parse a warranty string (e.g. "30 Hari", "3 Bulan", "1 Tahun") into days.
 * Returns 0 if the string cannot be parsed.
 */
export function parseWarrantyToDays(warranty: string | undefined | null): number {
  if (!warranty) return 0;
  const normalized = warranty.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*(hari|day|bulan|month|tahun|year)/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith('hari') || unit.startsWith('day')) return value;
  if (unit.startsWith('bulan') || unit.startsWith('month')) return value * 30;
  if (unit.startsWith('tahun') || unit.startsWith('year')) return value * 365;
  return 0;
}

/**
 * Given a list of spareparts (CartItem with optional warranty string),
 * return the maximum warrantyDays across all items.
 */
export function maxWarrantyDaysFromSpareparts(
  spareparts: Array<{ warranty?: string }>
): number {
  return spareparts.reduce((max, sp) => {
    const days = parseWarrantyToDays(sp.warranty);
    return days > max ? days : max;
  }, 0);
}

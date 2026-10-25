import type { ScanItem } from '../types.js';

function getScanCreatedTime(scan: ScanItem): number {
  const createdAt = (scan as ScanItem & { createdAt?: unknown }).createdAt;
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const parsed = new Date(createdAt).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof createdAt === 'object' && createdAt !== null && 'toDate' in createdAt) {
    const toDate = (createdAt as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      try {
        const parsed = toDate.call(createdAt);
        if (parsed instanceof Date && Number.isFinite(parsed.getTime())) return parsed.getTime();
      } catch { /* use the scan ID or display date as a fallback */ }
    }
  }

  // Locally-created scans use the creation time in their ID, which is more
  // precise than the display date and remains available for local-only scans.
  const idTimestamp = scan.id.match(/^scan-(\d{10,})(?:-[0-9a-f-]+)?$/i)?.[1];
  if (idTimestamp) {
    const parsed = Number(idTimestamp);
    if (Number.isFinite(parsed)) return parsed;
  }

  // Older and sample records may only have a human-readable date.
  const displayDate = Date.parse(scan.date.replace(/\b(\d{1,2})(st|nd|rd|th)\b/, '$1'));
  return Number.isFinite(displayDate) ? displayDate : 0;
}

export function sortScansNewestFirst(scans: readonly ScanItem[]): ScanItem[] {
  return scans
    .map((scan, index) => ({ scan, index, createdTime: getScanCreatedTime(scan) }))
    .sort((a, b) => b.createdTime - a.createdTime || a.index - b.index)
    .map(({ scan }) => scan);
}

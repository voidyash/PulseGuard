export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${Math.round(value * 100)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return String(value);
}

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, TIME_OPTIONS);
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, DATE_OPTIONS);
}

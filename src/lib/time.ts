const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "just now";
  }

  const delta = Math.max(0, Math.floor((now - then) / 1000));

  if (delta < 45) {
    return "just now";
  }
  if (delta < HOUR) {
    return `${Math.floor(delta / MINUTE)}m ago`;
  }
  if (delta < DAY) {
    return `${Math.floor(delta / HOUR)}h ago`;
  }
  if (delta < 7 * DAY) {
    return `${Math.floor(delta / DAY)}d ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(then);
}

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

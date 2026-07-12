export function getUserTimeZone(): string {
  if (typeof window !== "undefined" && window.Intl) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return "UTC";
}

export function getUTCOffset(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value) - 1;
  const day = Number(parts.find((p) => p.type === "day")?.value);
  let hour = Number(parts.find((p) => p.type === "hour")?.value);
  if (hour === 24) hour = 0;
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  const second = Number(parts.find((p) => p.type === "second")?.value);

  const targetUTC = Date.UTC(year, month, day, hour, minute, second);
  return targetUTC - date.getTime();
}

export function isoDate(date?: Date | string | null, timeZone?: string): string {
  const resolvedTZ = timeZone || getUserTimeZone();
  const dateObj = !date ? new Date() : typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: resolvedTZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(dateObj);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatToLocalInputValue(value: string | Date | null | undefined, timeZone = getUserTimeZone()): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  let hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;

  if (hour === "24") hour = "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseLocalInputValueToUTC(value: string, timeZone = getUserTimeZone()): string | null {
  if (!value) return null;
  const hasTime = value.includes("T");
  const isoString = hasTime ? `${value}:00Z` : `${value}T00:00:00Z`;
  const utcDate = new Date(isoString);
  if (isNaN(utcDate.getTime())) return null;

  const offset = getUTCOffset(utcDate, timeZone);
  return new Date(utcDate.getTime() - offset).toISOString();
}

export function prettyDate(value: string | Date | null | undefined, style: "long" | "short" = "long", timeZone = getUserTimeZone()): string {
  if (!value) return "";
  let date: Date;
  if (typeof value === "string") {
    if (value.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date = new Date(`${value}T00:00:00Z`);
      return new Intl.DateTimeFormat("en-US", {
        weekday: style === "long" ? "long" : undefined,
        month: "short",
        day: "numeric",
        year: style === "long" ? "numeric" : undefined,
        timeZone: "UTC",
      }).format(date);
    } else {
      date = new Date(value);
    }
  } else {
    date = value;
  }

  if (isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: style === "long" ? "long" : undefined,
    month: "short",
    day: "numeric",
    year: style === "long" ? "numeric" : undefined,
    timeZone,
  }).format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  style: "short" | "full" | "time" | "monthYear" = "short",
  timeZone = getUserTimeZone()
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "";

  let options: Intl.DateTimeFormatOptions = {};
  if (style === "short") {
    options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
  } else if (style === "time") {
    options = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
  } else if (style === "monthYear") {
    options = {
      month: "long",
      year: "numeric",
    };
  }

  if (style === "full") {
    const day = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone }).format(date);
    const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(date);
    const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(date);
    const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone }).format(date);
    return `${day} ${month} ${year}, ${time}`;
  }

  options.timeZone = timeZone;
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

export function formatSprintDate(dateStr: string): string {
  if (!dateStr || dateStr === "braindump") return "";
  const dateObj = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(dateObj.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(dateObj);
}

export function getUTCTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function greeting(timeZone = getUserTimeZone()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  });
  let hour = Number(formatter.format(new Date()));
  if (hour === 24) hour = 0;

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

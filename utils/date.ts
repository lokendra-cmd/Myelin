export function isoDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function prettyDate(value: string | Date, style: "long" | "short" = "long") {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat("en", {
    weekday: style === "long" ? "long" : undefined,
    month: "short",
    day: "numeric",
    year: style === "long" ? "numeric" : undefined,
  }).format(date);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

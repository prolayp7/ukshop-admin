export function safeReturnPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value === "/login" || value.startsWith("/login?")) return fallback;
  return value;
}

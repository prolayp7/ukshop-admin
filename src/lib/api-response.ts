export function collectionFromApi<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const record = payload as { data?: unknown; items?: unknown };
  if (Array.isArray(record.data)) return record.data as T[];
  if (Array.isArray(record.items)) return record.items as T[];
  if (record.data && typeof record.data === "object") {
    const nested = record.data as { items?: unknown };
    if (Array.isArray(nested.items)) return nested.items as T[];
  }
  return [];
}

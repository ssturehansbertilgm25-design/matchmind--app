export async function call<T>(
  url: string,
  options?: { method?: string; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "Något gick fel";
    return { ok: false, error };
  }
  return { ok: true, data: data as T };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

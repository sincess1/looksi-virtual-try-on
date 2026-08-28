type Entry = {
  count: number;
  resetAt: number;
};

const entries = new Map<string, Entry>();
const windowDuration = 15 * 60 * 1000;

export function requestIdentity(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function rateLimit(identity: string) {
  const now = Date.now();
  const limit = process.env.NODE_ENV === "development" ? 20 : 4;
  const current = entries.get(identity);

  if (!current || current.resetAt <= now) {
    entries.set(identity, { count: 1, resetAt: now + windowDuration });
    return 0;
  }

  if (current.count >= limit) {
    return Math.ceil((current.resetAt - now) / 1000);
  }

  current.count += 1;
  if (entries.size > 500) {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
  }
  return 0;
}

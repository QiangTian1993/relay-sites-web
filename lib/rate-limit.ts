import "server-only";

/**
 * 进程内滑动窗口限流（单容器部署足够；多实例需换 Redis）。
 */

const buckets = new Map<string, number[]>();
let lastSweepAt = Date.now();

export interface RateLimitResult {
  ok: boolean;
  /** 拒绝时建议的等待秒数 */
  retryAfterSec: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // 低频清理：避免 Map 无限增长
  if (now - lastSweepAt > windowMs) {
    for (const [k, hits] of buckets) {
      const alive = hits.filter((t) => now - t < windowMs);
      if (alive.length === 0) buckets.delete(k);
      else buckets.set(k, alive);
    }
    lastSweepAt = now;
  }

  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const oldest = Math.min(...hits);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSec: 0 };
}

/** 从请求头提取客户端 IP（nginx 反代场景取 X-Forwarded-For 首个） */
export function clientIpOf(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

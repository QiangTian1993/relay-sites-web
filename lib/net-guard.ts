import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF 防护：校验用户提交的探针目标 URL。
 * 仅允许公网 http/https 地址，拒绝内网/保留段/链路本地/元数据地址。
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true; // 本机 / 内网
  if (a === 169 && b === 254) return true; // 链路本地 / 云元数据 (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 私网
  if (a === 192 && b === 168) return true; // 私网
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 协议保留
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // 基准测试段
  if (a >= 224) return true; // 组播 + 保留段
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:10.0.0.1)
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // unique local fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  return false;
}

function isPrivateAddress(address: string): boolean {
  const family = net.isIPv4(address) ? 4 : net.isIPv6(address) ? 6 : 0;
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

export class UrlGuardError extends Error {}

/**
 * 校验并规范化探针目标地址。
 * 返回 `origin`（协议+主机）与 `base`（含规范化路径，保证以 /v1 结尾），
 * 供调用方拼接 /chat/completions。抛出 UrlGuardError 表示目标不合法。
 */
export async function assertPublicHttpUrl(raw: string): Promise<{ origin: string; base: string }> {
  let cleaned = raw.trim().replace(/\/+$/, "");
  if (!cleaned) throw new UrlGuardError("API 地址为空");
  if (!/^https?:\/\//i.test(cleaned)) cleaned = `https://${cleaned}`;

  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    throw new UrlGuardError("API 地址格式无法解析");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlGuardError("仅允许 http/https 协议");
  }
  if (url.username || url.password) {
    throw new UrlGuardError("不允许携带认证信息的 URL");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new UrlGuardError("禁止探测内网/保留域名");
  }

  // 主机名本身是 IP 字面量时直接判断；否则解析 DNS 后逐一校验（防 DNS 指向内网）
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new UrlGuardError("禁止探测内网/保留 IP 地址");
    }
  } else {
    let addresses: Array<{ address: string }> = [];
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new UrlGuardError(`域名解析失败: ${hostname}`);
    }
    if (addresses.length === 0) {
      throw new UrlGuardError(`域名解析失败: ${hostname}`);
    }
    for (const { address } of addresses) {
      if (isPrivateAddress(address)) {
        throw new UrlGuardError("该域名解析到内网/保留 IP，已拦截");
      }
    }
  }

  // 保留用户自定义路径（如 /openai），规范化为以 /v1 结尾
  const pathname = url.pathname.replace(/\/+$/, "");
  const basePath = pathname.endsWith("/v1") ? pathname : `${pathname}/v1`;

  return { origin: url.origin, base: `${url.origin}${basePath}` };
}

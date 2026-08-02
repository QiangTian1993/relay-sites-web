// 直连飞书 Bitable API，替代 lark-cli subprocess
// 认证：FEISHU_APP_ID + FEISHU_APP_SECRET → tenant_access_token（2h TTL，提前 5min 续期）
// 数据：row-based items → KeyedRecord[]，与原 data-loader 接口兼容

import type { KeyedRecord } from "./types";

const FEISHU_API = "https://open.feishu.cn/open-apis";
const PAGE_SIZE = 500; // Bitable API 单页最大值

interface TokenCache {
  token: string;
  expiresAt: number; // Unix ms
}

// 进程级 token 缓存 —— 同一个 Node 进程内复用，不跨进程
let _tokenCache: TokenCache | null = null;

async function getTenantToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Missing env vars: FEISHU_APP_ID and FEISHU_APP_SECRET are required");
  }
  const res = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Feishu auth HTTP ${res.status}`);
  const json = (await res.json()) as {
    code: number;
    msg?: string;
    tenant_access_token?: string;
    expire?: number;
  };
  if (json.code !== 0 || !json.tenant_access_token) {
    throw new Error(`Feishu auth failed (code ${json.code}): ${json.msg}`);
  }
  // 提前 5 分钟过期，防止边界情况下使用即将失效的 token
  _tokenCache = {
    token: json.tenant_access_token,
    expiresAt: Date.now() + (json.expire! - 300) * 1000,
  };
  return _tokenCache.token;
}

/** 拉取飞书多维表格全量记录，自动翻页，返回 KeyedRecord[] */
export async function fetchTableRecords(
  baseToken: string,
  tableId: string,
): Promise<KeyedRecord[]> {
  const token = await getTenantToken();
  const records: KeyedRecord[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${FEISHU_API}/bitable/v1/apps/${baseToken}/tables/${tableId}/records`,
    );
    url.searchParams.set("page_size", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("page_token", pageToken);

    // 不指定 cache，SSG 构建时 Next.js 默认 force-cache，使首页能静态生成
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as {
      code: number;
      msg?: string;
      data?: {
        has_more: boolean;
        page_token?: string;
        items?: Array<{ record_id: string; fields: Record<string, unknown> }>;
      };
    };
    if (!res.ok || json.code !== 0) {
      throw new Error(
        `Feishu records failed: HTTP ${res.status}, code ${json.code}, ${json.msg ?? "no message"} (table ${tableId})`
      );
    }

    for (const item of json.data?.items ?? []) {
      records.push({ __id: item.record_id, ...item.fields });
    }
    pageToken = json.data?.has_more ? json.data.page_token : undefined;
  } while (pageToken);

  return records;
}

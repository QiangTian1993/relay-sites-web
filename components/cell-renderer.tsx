// 通用 cell 渲染器 —— 与列表页共享 renderSpecialField（保持样式一致）

import type { ReactNode } from "react";
import type { TableField } from "@/lib/tables";
import { truncate, toStringArray, formatNumber } from "@/lib/utils";
import { IconExternal } from "./icons";
import { Tag } from "./views/tag";
import { renderSpecialField } from "@/lib/render-fields";

export function renderCell(
  field: TableField,
  value: unknown,
  record?: Record<string, unknown>
): ReactNode {
  // 特殊字段 key 的 JSX 渲染优先（与列表页共用）
  const special = renderSpecialField(field.key, value);
  if (special !== null) return special;

  const str = value == null ? "" : String(value);

  switch (field.type) {
    case "text":
      return <span className="font-mono text-zinc-800">{str || "—"}</span>;

    case "longtext":
      return (
        <span className="text-zinc-600" title={str}>
          {truncate(str, 80) || "—"}
        </span>
      );

    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return <span className="font-mono text-zinc-300">—</span>;
      }
      const formatted = (() => {
        switch (field.formatHint) {
          case "rate":
            return `${formatNumber(value)}x`;
          case "ratio-percent":
            return `${formatNumber(value * 100)}%`;
          case "percent":
            return `${formatNumber(value)}%`;
          case "currency-cny":
            return `¥${formatNumber(value)}`;
          default:
            return formatNumber(value);
        }
      })();
      return (
        <span className="font-mono font-bold text-zinc-900">
          {formatted}
        </span>
      );
    }

    case "single-select": {
      if (!str) return <span className="font-mono text-zinc-300">—</span>;
      return <Tag variant="filled">{str}</Tag>;
    }

    case "multi-select": {
      const arr = toStringArray(value);
      if (arr.length === 0) return <span className="font-mono text-zinc-300">—</span>;
      return (
        <div className="inline-flex flex-wrap gap-1.5">
          {arr.map((s) => (
            <Tag key={s} variant="filled-success">
              {s}
            </Tag>
          ))}
        </div>
      );
    }

    case "url": {
      const url = extractUrl(value);
      if (!url) return <span className="font-mono text-zinc-300">—</span>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
        >
          <span className="truncate max-w-[200px]">{displayUrl(url)}</span>
          <IconExternal className="h-3 w-3 stroke-[2]" />
        </a>
      );
    }

    case "date": {
      if (!str) return <span className="font-mono text-zinc-300">—</span>;
      const d = new Date(str);
      if (Number.isNaN(d.getTime())) return <span className="font-mono text-xs text-zinc-400">{str}</span>;
      return (
        <span className="font-mono text-xs text-zinc-500">
          {d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
        </span>
      );
    }

    default:
      return <span className="font-mono text-zinc-800">{str || "—"}</span>;
  }
}

/** 把 https://x.com/path 显示为 x.com/path（去掉协议） */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** 从各种格式里抽出 URL 字符串 */
function extractUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  const md = trimmed.match(/\]\((https?:\/\/[^)]+)\)/);
  if (md) return md[1];
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

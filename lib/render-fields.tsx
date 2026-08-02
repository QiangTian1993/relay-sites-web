// 特殊字段渲染 —— list-view 和 cell-renderer 共用（保持样式一致）
// 加新字段特殊渲染只改这里

import type { ReactNode } from "react";
import { IconStar } from "@/components/icons";
import { Tag } from "@/components/views/tag";

/** 分组倍率："OpenAI 0.2x | Claude 0.32x" → Tag 列 */
function renderGroupRate(value: unknown): ReactNode {
  if (typeof value !== "string" || !value) return null;
  const parts = value.split("|").map((p) => p.trim()).filter(Boolean);
  return (
    <div className="inline-flex flex-wrap gap-1.5">
      {parts.map((p, i) => {
        const m = p.match(/^(\S+)\s+(\S+)$/);
        if (!m) return <span key={i} className="font-mono text-sm text-swiss-fg/50">{p}</span>;
        const [, name, rate] = m;
        return (
          <Tag key={i} variant="filled-success">
            <span>{name}</span>
            <span className="font-mono opacity-80">{rate}</span>
          </Tag>
        );
      })}
    </div>
  );
}

/** 评分（vibe_coding）→ 按分值上色 */
function renderRating(value: unknown): ReactNode {
  if (typeof value !== "number") return null;
  const tier =
    value >= 4.5 ? "filled-success" :
    value >= 4 ? "filled-info" :
    value >= 3 ? "filled-warning" : "default";
  return (
    <span className="inline-flex items-center gap-1">
      <Tag variant={tier as never}>
        <IconStar className="h-3 w-3 fill-current stroke-[1.5]" />
        {value}
      </Tag>
    </span>
  );
}

/** 最低倍率（relay_sites）→ 0.001x */
function renderLowestRate(value: unknown): ReactNode {
  if (typeof value !== "number") return null;
  return <Tag variant="filled-success">{value}x</Tag>;
}

/** GitHub stars（vibe_coding）→ 千分位 */
function renderGitHubStars(value: unknown): ReactNode {
  if (typeof value !== "number") return null;
  return <Tag variant="filled-info">{value.toLocaleString("en-US")}</Tag>;
}

/** 主入口：根据字段 key 返回特殊渲染的 ReactNode，否则 null（用默认渲染） */
export function renderSpecialField(fieldKey: string, value: unknown): ReactNode | null {
  if (fieldKey === "分组倍率") return renderGroupRate(value);
  if (fieldKey === "评分") return renderRating(value);
  if (fieldKey === "最低倍率") return renderLowestRate(value);
  if (fieldKey === "GitHub stars") return renderGitHubStars(value);
  return null;
}
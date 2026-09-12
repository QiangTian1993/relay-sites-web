// Tag 组件 —— 通用 chip / 标签 / 状态点（带背景变体）
// 变体：
//   - default:        普通黑边白底
//   - success:        绿色边框 + dot
//   - warning:        橙色边框
//   - accent:         Swiss Red 背景（详情页 D.01 风格）
//   - mono:           单色 mono
//   - filled:         黑底白字（详情页 D.03 风格）
//   - filled-success: 浅绿背景（helpaio 风格）
//   - filled-warning: 浅橙背景
//   - filled-info:    浅蓝背景
//
// 用例：
//   <Tag>OpenAI</Tag>
//   <Tag variant="success" dot>Claude</Tag>
//   <Tag variant="filled-success">★ 5</Tag>
//   <Tag variant="accent">PRO</Tag>

import type { ReactNode } from "react";

export type TagVariant =
  | "default"
  | "success"
  | "warning"
  | "accent"
  | "mono"
  | "filled"
  | "filled-success"
  | "filled-warning"
  | "filled-info";

interface Props {
  children: ReactNode;
  variant?: TagVariant;
  /** 左侧加一个小方块/圆点 */
  dot?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<TagVariant, string> = {
  default: "border border-zinc-200/80 bg-zinc-50 text-zinc-700 shadow-2xs",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border border-amber-200 bg-amber-50 text-amber-700",
  accent: "border border-rose-200 bg-rose-50 text-[#E03E1A]",
  mono: "border border-zinc-200 bg-zinc-50 font-mono text-zinc-600",
  filled: "bg-zinc-900 text-white shadow-2xs",
  "filled-success": "border border-emerald-200 bg-emerald-50 text-emerald-700",
  "filled-warning": "border border-amber-200 bg-amber-50 text-amber-700",
  "filled-info": "border border-blue-200 bg-blue-50 text-blue-700",
};

const DOT_CLASSES: Record<TagVariant, string> = {
  default: "bg-zinc-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  accent: "bg-[#E03E1A]",
  mono: "bg-zinc-400",
  filled: "bg-white",
  "filled-success": "bg-emerald-500",
  "filled-warning": "bg-amber-500",
  "filled-info": "bg-blue-500",
};

export function Tag({ children, variant = "default", dot = false, className = "" }: Props) {
  const variantClasses = VARIANT_CLASSES[variant];
  const dotClass = DOT_CLASSES[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${variantClasses} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
      <span>{children}</span>
    </span>
  );
}
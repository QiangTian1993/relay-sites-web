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
  default: "border-swiss-fg/40 text-swiss-fg group-hover:border-swiss-bg/40 group-hover:text-swiss-bg",
  success: "border-swiss-success text-swiss-fg group-hover:border-swiss-bg/40 group-hover:text-swiss-bg",
  warning: "border-swiss-warning text-swiss-fg group-hover:border-swiss-bg/40 group-hover:text-swiss-bg",
  accent: "border-swiss-accent bg-swiss-accent text-swiss-bg group-hover:bg-swiss-bg group-hover:text-swiss-accent",
  mono: "border-swiss-fg/40 font-mono tracking-normal text-sm text-swiss-fg/70 group-hover:text-swiss-bg/70",
  // 带背景变体（详情页 D.01 / hel paio 风格）
  filled: "border-swiss-fg bg-swiss-fg text-swiss-bg group-hover:bg-swiss-bg group-hover:text-swiss-fg",
  "filled-success": "border-swiss-success bg-swiss-successBg text-swiss-fg group-hover:bg-swiss-bg/20",
  "filled-warning": "border-swiss-warning bg-swiss-warningBg text-swiss-fg group-hover:bg-swiss-bg/20",
  "filled-info": "border-swiss-info bg-swiss-infoBg text-swiss-fg group-hover:bg-swiss-bg/20",
};

const DOT_CLASSES: Record<TagVariant, string> = {
  default: "bg-swiss-fg group-hover:bg-swiss-bg",
  success: "bg-swiss-success",
  warning: "bg-swiss-warning",
  accent: "bg-swiss-bg group-hover:bg-swiss-accent",
  mono: "bg-swiss-fg/50 group-hover:bg-swiss-bg/50",
  filled: "bg-swiss-bg group-hover:bg-swiss-fg",
  "filled-success": "bg-swiss-success",
  "filled-warning": "bg-swiss-warning",
  "filled-info": "bg-swiss-info",
};

export function Tag({ children, variant = "default", dot = false, className = "" }: Props) {
  const variantClasses = VARIANT_CLASSES[variant];
  const dotClass = DOT_CLASSES[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-sm font-bold tracking-normal ${variantClasses} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 ${dotClass}`} />}
      <span>{children}</span>
    </span>
  );
}
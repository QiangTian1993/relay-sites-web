// FieldRow 组件 —— label + value 行（dl/dt/dd 语义化，带 layout 变体）
// 用例：
//   <FieldRow label="框架" value="sub2api" first />              // inline：label + value 同行
//   <FieldRow label="分组倍率" value={<Tag>...</Tag>} layout="block" />  // block：label 上 / value 下独立成块
//
// layout:
//   - "inline": 默认。label + value baseline 对齐同一行
//   - "block":  label 在上，value 在下独立成块（与详情页 dl/dt/dd 一致）
//
// labelStyle:
//   - "default" 灰小字（紧凑）
//   - "filled"  灰底 + 边框（详情页 D.02 风格，更明显）

import type { ReactNode } from "react";

type LabelStyle = "default" | "filled";
type Layout = "inline" | "block";

interface Props {
  label: string;
  value: ReactNode;
  /** 是否第一行（第一行不显示顶部 border） */
  first?: boolean;
  /** label 宽度（默认 80px = w-20） */
  labelWidth?: string;
  /** label 样式 */
  labelStyle?: LabelStyle;
  /** 布局模式（inline 同行 / block label-上-value-下） */
  layout?: Layout;
}

export function FieldRow({
  label,
  value,
  first = false,
  labelWidth = "w-20",
  labelStyle = "default",
  layout = "inline",
}: Props) {
  const labelClasses =
    labelStyle === "filled"
      ? "bg-swiss-muted border border-swiss-fg/20 px-2 py-0.5 text-swiss-fg/70 group-hover:bg-swiss-bg/20 group-hover:border-swiss-bg/20 group-hover:text-swiss-bg/70"
      : "text-swiss-fg/40 group-hover:text-swiss-bg/40";

  if (layout === "block") {
    return (
      <div
        className={`flex flex-col gap-1.5 py-2 ${
          first ? "" : "border-t border-swiss-fg/15 group-hover:border-swiss-bg/15"
        }`}
      >
        <dt
          className={`font-mono text-sm font-black uppercase tracking-widest ${labelClasses}`}
        >
          {label}
        </dt>
        <dd className="font-mono text-sm font-medium text-swiss-fg group-hover:text-swiss-bg">
          {value}
        </dd>
      </div>
    );
  }

  // inline 模式（默认）—— 字段名 + value 同行（value 自动换行）
  return (
    <div
      className={`flex items-start gap-3 py-2 ${
        first ? "" : "border-t border-swiss-fg/15 group-hover:border-swiss-bg/15"
      }`}
    >
      <dt
        className={`${labelWidth} shrink-0 self-center font-mono text-sm font-black uppercase tracking-widest ${labelClasses}`}
      >
        {label}
      </dt>
      <dd className="flex-1 font-mono text-sm font-medium text-swiss-fg group-hover:text-swiss-bg break-words">
        {value}
      </dd>
    </div>
  );
}
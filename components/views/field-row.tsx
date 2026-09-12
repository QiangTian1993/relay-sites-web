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
      ? "bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-zinc-600 rounded"
      : "text-zinc-400";

  if (layout === "block") {
    return (
      <div
        className={`flex flex-col gap-1 py-1.5 ${
          first ? "" : "border-t border-zinc-100"
        }`}
      >
        <dt
          className={`font-mono text-xs font-semibold uppercase tracking-wider ${labelClasses}`}
        >
          {label}
        </dt>
        <dd className="font-mono text-xs text-zinc-800">
          {value}
        </dd>
      </div>
    );
  }

  // inline 模式（默认）
  return (
    <div
      className={`flex items-start gap-2.5 py-1.5 ${
        first ? "" : "border-t border-zinc-100"
      }`}
    >
      <dt
        className={`${labelWidth} shrink-0 self-center font-mono text-xs font-semibold uppercase tracking-wider ${labelClasses}`}
      >
        {label}
      </dt>
      <dd className="flex-1 font-mono text-xs text-zinc-800 break-words">
        {value}
      </dd>
    </div>
  );
}
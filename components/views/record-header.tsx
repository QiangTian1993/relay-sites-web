// RecordHeader 组件 —— 记录顶部（编号 + 状态点 + 标题 + 副标）

import type { ReactNode } from "react";
import { IconCircleCheck, IconCircleAlert, IconCircleDot } from "../icons";

export type RecordStatus = "ok" | "warn" | "unknown";

interface Props {
  rank: number;
  status: RecordStatus;
  title: ReactNode;
  subtitle?: ReactNode;
}

export function RecordHeader({ rank, status, title, subtitle }: Props) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="truncate text-lg font-bold leading-tight tracking-tight text-zinc-900 group-hover:text-indigo-600 transition-colors sm:text-xl">
        {title}
      </h3>
      {subtitle != null && (
        <span className="hidden truncate font-mono text-xs font-normal tracking-wide text-zinc-400 group-hover:text-zinc-500 sm:inline">
          · {subtitle}
        </span>
      )}
    </div>
  );
}

/** 状态点 ●（helpaio 风格）—— 圆形 icon badge */
export function StatusDot({ status }: { status: RecordStatus }) {
  if (status === "ok") {
    return <IconCircleCheck className="h-3.5 w-3.5 stroke-[2.5] text-emerald-500" />;
  }
  if (status === "warn") {
    return <IconCircleAlert className="h-3.5 w-3.5 stroke-[2.5] text-amber-500" />;
  }
  return <IconCircleDot className="h-3.5 w-3.5 stroke-[2.5] text-zinc-300" />;
}

/** 编号 + 状态点列（用于行最左） */
export function RecordIndex({ rank, status }: { rank: number; status: RecordStatus }) {
  return (
    <div className="flex flex-col items-center gap-1 pt-0.5">
      <span className="font-mono text-[10px] font-semibold text-zinc-400 group-hover:text-zinc-600">
        {String(rank).padStart(2, "0")}
      </span>
      <StatusDot status={status} />
    </div>
  );
}
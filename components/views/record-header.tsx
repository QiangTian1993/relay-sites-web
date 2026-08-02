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
      <h3 className="truncate text-xl font-bold leading-tight tracking-tight text-swiss-fg group-hover:text-swiss-bg sm:text-2xl">
        {title}
      </h3>
      {subtitle != null && (
        <span className="hidden truncate font-mono text-sm uppercase tracking-widest text-swiss-fg/50 group-hover:text-swiss-bg/50 sm:inline">
          · {subtitle}
        </span>
      )}
    </div>
  );
}

/** 状态点 ●（helpaio 风格）—— 圆形 icon badge */
export function StatusDot({ status }: { status: RecordStatus }) {
  if (status === "ok") {
    return <IconCircleCheck className="h-4 w-4 stroke-[2.5] text-swiss-success" />;
  }
  if (status === "warn") {
    return <IconCircleAlert className="h-4 w-4 stroke-[2.5] text-swiss-warning" />;
  }
  return <IconCircleDot className="h-4 w-4 stroke-[2.5] text-swiss-fg/40" />;
}

/** 编号 + 状态点列（用于行最左） */
export function RecordIndex({ rank, status }: { rank: number; status: RecordStatus }) {
  return (
    <div className="flex flex-col items-center gap-1 pt-1">
      <span className="font-mono text-[8px] uppercase tracking-widest text-swiss-fg/40 group-hover:text-swiss-bg/40">
        {String(rank).padStart(2, "0")}
      </span>
      <StatusDot status={status} />
    </div>
  );
}
// KeyMetric 组件 —— 关键数字 hero（Swiss Red 大数字）
// 用于行右侧的"一眼看到"焦点数字：
//   <KeyMetric icon="zap" label="LOW" value="0.055x" />

import type { ReactNode } from "react";
import { IconZap, IconStar, IconArrowRight } from "../icons";

export type KeyMetricIcon = "zap" | "star" | "arrow";

interface Props {
  icon?: KeyMetricIcon;
  label?: string;
  value: ReactNode;
  /** 单位（跟在 value 后面的小字） */
  unit?: string;
  /** 显示为空状态 */
  empty?: boolean;
}

const ICONS = {
  zap: IconZap,
  star: IconStar,
  arrow: IconArrowRight,
};

export function KeyMetric({ icon = "zap", label, value, unit, empty = false }: Props) {
  const Icon = ICONS[icon];

  if (empty) {
    return (
      <div className="flex items-center justify-end font-mono text-2xl text-swiss-fg/30 group-hover:text-swiss-bg/40">
        <IconArrowRight className="h-5 w-5 stroke-[2]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end text-right">
      {label && (
        <span className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-ultra text-swiss-fg/60 group-hover:text-swiss-bg/60">
          <Icon className="h-3 w-3 stroke-[2]" />
          <span>{label}</span>
        </span>
      )}
      <span className="font-mono text-2xl font-black leading-none tracking-tighter text-swiss-accent group-hover:text-swiss-bg sm:text-3xl">
        {value}
      </span>
      {unit && (
        <span className="mt-1 hidden font-mono text-[8px] uppercase tracking-ultra text-swiss-fg/40 group-hover:text-swiss-bg/40 sm:inline">
          {unit}
        </span>
      )}
    </div>
  );
}
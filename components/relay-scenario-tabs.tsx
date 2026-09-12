"use client";

import { Code2, DollarSign, FileCheck, Layers, Sparkles } from "lucide-react";

export type ScenarioPreset = "all" | "coding" | "low_cost" | "verified";

interface RelayScenarioTabsProps {
  activePreset: ScenarioPreset;
  onSelectPreset: (preset: ScenarioPreset) => void;
}

export function RelayScenarioTabs({ activePreset, onSelectPreset }: RelayScenarioTabsProps) {
  const presets: { id: ScenarioPreset; label: string; desc: string; icon: any }[] = [
    { id: "all", label: "全量展示", desc: "不限分类查看全量站点", icon: Layers },
    { id: "coding", label: "Claude/Cursor 编程选站", desc: "包含 MAX 纯血/Kiro 高缓存分组", icon: Code2 },
    { id: "low_cost", label: "极致低价组 (<=0.05x)", desc: "特价福利池/高并发冲量首选", icon: DollarSign },
    { id: "verified", label: "开票与服务保障站", desc: "可开发票/无手续费退款/稳定老站", icon: FileCheck },
  ];

  return (
    <div className="mb-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {presets.map((item) => {
        const Icon = item.icon;
        const isActive = activePreset === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPreset(item.id)}
            className={`group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 ${
              isActive
                ? "border-zinc-900 bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-900"
                : "border-zinc-200/80 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/80 shadow-xs"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "border border-zinc-200/80 bg-zinc-50 text-zinc-600 group-hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-xs font-semibold tracking-tight truncate">{item.label}</div>
              <div className={`mt-0.5 text-[11px] leading-tight ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                {item.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

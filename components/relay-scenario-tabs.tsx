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
    <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {presets.map((item) => {
        const Icon = item.icon;
        const isActive = activePreset === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPreset(item.id)}
            className={`flex items-start gap-3 border-2 p-3 text-left transition-all ${
              isActive
                ? "border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,0,0,1)]"
                : "border-black/20 bg-white text-black hover:border-black hover:bg-[#f8f8f5]"
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center border ${
                isActive ? "border-white bg-swiss-accent text-white" : "border-black/20 bg-black/5 text-black"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="font-mono text-xs font-black uppercase tracking-wider">{item.label}</div>
              <div className={`mt-0.5 font-mono text-[10px] ${isActive ? "text-white/70" : "text-black/50"}`}>
                {item.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

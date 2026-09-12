// Explorer 筛选器 —— PRD F.05
// Provider 多选 + 倍率区间 slider + 可用率门槛

"use client";

import { IconClose, IconSearch } from "../icons";
import { PROVIDERS } from "@/lib/matrix";

export interface FilterState {
  search: string;
  modelQuery: string;
  /** 多选 provider 集合；空数组 = 全部 */
  providers: string[];
  /** 最低倍率上限（0-2x） */
  rateMax: number;
  /** 可用率门槛（0/90/95/98） */
  availabilityThreshold: number;
  sortKey: "rate" | "availability" | "ttft" | "updated";
  onlyMeasured: boolean;
  onlyModelData: boolean;
  onlyRegistration: boolean;
  onlyNoVerify: boolean;
}

interface Props {
  state: FilterState;
  modelNames: string[];
  filteredCount: number;
  totalCount: number;
  viewMode: "list" | "matrix" | "model";
  onChange: (next: Partial<FilterState>) => void;
  onClearFilters: () => void;
  onViewModeChange: (mode: "list" | "matrix" | "model") => void;
}

export function FilterBar({ state, modelNames, filteredCount, totalCount, viewMode, onChange, onClearFilters, onViewModeChange }: Props) {
  const hasActiveFilters = state.providers.length > 0 || state.rateMax < 2 || state.availabilityThreshold > 0 || state.onlyMeasured || state.onlyModelData || state.onlyRegistration || state.onlyNoVerify || state.search || state.modelQuery;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-4 py-2.5 text-zinc-800">
        <div className="flex min-w-[200px] items-center gap-2.5 font-mono text-xs">
          <span className="rounded-full bg-[#E03E1A] px-2 py-0.5 font-bold text-white text-[10px]">F.01</span>
          <span className="font-semibold text-zinc-900">站点目录检索与配置</span>
          <span className="text-zinc-400 font-normal">({filteredCount} / {totalCount} 站)</span>
        </div>
        <div className="flex items-center rounded-xl bg-zinc-100/80 p-1 border border-zinc-200/60 mt-2 sm:mt-0">
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              viewMode === "list" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
            aria-pressed={viewMode === "list"}
          >
            列表视图
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("matrix")}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              viewMode === "matrix" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
            aria-pressed={viewMode === "matrix"}
          >
            Provider 矩阵
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("model")}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              viewMode === "model" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
            title="按模型查覆盖站点；价格决策请使用模型比价"
            aria-pressed={viewMode === "model"}
          >
            模型覆盖
          </button>
        </div>
      </div>

      {/* Row 1：搜索 + 模型查询 */}
      <div className="grid grid-cols-1 border-b border-zinc-100 lg:grid-cols-2">
        <label className="flex min-w-0 items-center border-b border-zinc-100 lg:border-b-0 lg:border-r">
          <span className="flex h-full w-11 shrink-0 items-center justify-center text-zinc-400">
            <IconSearch className="h-4 w-4" />
          </span>
          <input
            value={state.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="搜索站点名称、域名或备注..."
            className="min-w-0 flex-1 bg-transparent px-2 py-3 font-mono text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          {state.search && (
            <button type="button" onClick={() => onChange({ search: "" })} className="h-full px-3 text-zinc-400 hover:text-zinc-700" aria-label="清空搜索">
              <IconClose className="h-3.5 w-3.5" />
            </button>
          )}
        </label>

        <label className="flex items-center">
          <span className="px-3 font-mono text-xs text-zinc-400">模型</span>
          <input
            value={state.modelQuery}
            onChange={(event) => onChange({ modelQuery: event.target.value })}
            list="relay-model-options"
            placeholder="输入目标模型 (如 gpt-5.4 / claude-3-7)..."
            className="min-w-0 flex-1 bg-transparent px-2 py-3 font-mono text-xs font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <datalist id="relay-model-options">
            {modelNames.map((name) => <option key={name} value={name} />)}
          </datalist>
          {state.modelQuery && (
            <button type="button" onClick={() => onChange({ modelQuery: "" })} className="h-full px-3 text-zinc-400 hover:text-zinc-700" aria-label="清空模型">
              <IconClose className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
      </div>

      {/* Row 2: Provider 多选 + 倍率 slider + 可用率门槛 */}
      <div className="grid grid-cols-1 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 bg-white lg:grid-cols-3">
        {/* Provider 多选 */}
        <div className="p-4">
          <div className="font-mono text-xs font-semibold text-zinc-500">Provider 筛选</div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {PROVIDERS.map((p) => {
              const selected = state.providers.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const next = selected ? state.providers.filter((x) => x !== p) : [...state.providers, p];
                    onChange({ providers: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                    selected
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            {state.providers.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ providers: [] })}
                className="rounded-lg border border-zinc-200 px-2 py-1 font-mono text-xs text-zinc-400 hover:text-zinc-700 hover:border-zinc-300"
              >
                × 清空
              </button>
            )}
          </div>
        </div>

        {/* 倍率区间 slider */}
        <div className="p-4">
          <div className="flex items-baseline justify-between font-mono text-xs font-semibold text-zinc-500">
            <span>最低倍率上限</span>
            <span className="text-zinc-900 font-bold">≤ {state.rateMax.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={state.rateMax}
            onChange={(event) => onChange({ rateMax: Number(event.target.value) })}
            className="mt-3 w-full cursor-pointer appearance-none rounded-lg bg-zinc-100 accent-zinc-900 h-2"
          />
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-400">
            <span>0×</span>
            <span>1×</span>
            <span>2×</span>
          </div>
        </div>

        {/* 可用率门槛 */}
        <div className="p-4">
          <div className="font-mono text-xs font-semibold text-zinc-500">可用率门槛 (7D)</div>
          <div className="mt-2.5 flex gap-1.5">
            {[0, 90, 95, 98].map((threshold) => {
              const selected = state.availabilityThreshold === threshold;
              const label = threshold === 0 ? "全部" : `≥${threshold}%`;
              return (
                <button
                  key={threshold}
                  type="button"
                  onClick={() => onChange({ availabilityThreshold: threshold })}
                  className={`flex-1 rounded-lg border px-2 py-1 font-mono text-xs font-semibold transition-all ${
                    selected
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: 复选框 + 排序 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-2.5 font-mono text-xs">
        <label className="flex cursor-pointer items-center gap-2 text-zinc-700">
          <input type="checkbox" checked={state.onlyMeasured} onChange={(event) => onChange({ onlyMeasured: event.target.checked })} className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900" />
          <span>有探针实测</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-zinc-700">
          <input type="checkbox" checked={state.onlyModelData} onChange={(event) => onChange({ onlyModelData: event.target.checked })} className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900" />
          <span>有模型明细</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-zinc-700">
          <input type="checkbox" checked={state.onlyRegistration} onChange={(event) => onChange({ onlyRegistration: event.target.checked })} className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900" />
          <span>开放注册</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-zinc-700">
          <input type="checkbox" checked={state.onlyNoVerify} onChange={(event) => onChange({ onlyNoVerify: event.target.checked })} className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900" />
          <span>免验证</span>
        </label>
        <label className="ml-auto flex items-center gap-2">
          <span className="text-zinc-400">排序</span>
          <select
            value={state.sortKey}
            onChange={(event) => onChange({ sortKey: event.target.value as FilterState["sortKey"] })}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-zinc-800 outline-none shadow-2xs"
          >
            <option value="availability">7 日可用率</option>
            <option value="rate">{state.modelQuery ? "原始费率参考" : "全站最低（参考）"}</option>
            <option value="updated">最近检查</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button type="button" onClick={onClearFilters} className="font-semibold text-[#E03E1A] hover:underline">
            清除筛选
          </button>
        )}
      </div>
    </section>
  );
}
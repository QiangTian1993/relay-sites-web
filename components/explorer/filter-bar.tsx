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
    <section className="border-2 border-swiss-fg bg-swiss-bg">
      {/* Header */}
      <div className="flex flex-wrap items-stretch border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
        <div className="flex min-w-[220px] flex-1 items-center gap-3 px-4 py-2.5 font-mono text-sm uppercase tracking-widest">
          <span className="bg-swiss-accent px-1.5 py-0.5 font-black">F.01</span>
          <span>站点筛选</span>
          <span className="ml-auto text-swiss-bg/60">{filteredCount} / {totalCount}</span>
        </div>
        <div className="flex border-t-2 border-swiss-bg sm:border-l-2 sm:border-t-0">
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`flex h-11 items-center gap-2 px-4 font-mono text-sm font-black uppercase tracking-widest sm:h-10 ${viewMode === "list" ? "bg-swiss-bg text-swiss-fg" : "text-swiss-bg hover:bg-swiss-bg/15"}`}
            aria-pressed={viewMode === "list"}
          >
            列表
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("matrix")}
            className={`flex h-11 items-center gap-2 border-l border-swiss-bg/30 px-4 font-mono text-sm font-black uppercase tracking-widest sm:h-10 ${viewMode === "matrix" ? "bg-swiss-bg text-swiss-fg" : "text-swiss-bg hover:bg-swiss-bg/15"}`}
            aria-pressed={viewMode === "matrix"}
          >
            Provider 对比
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("model")}
            title="按模型查覆盖站点；价格决策请使用模型比价"
          >
            模型覆盖
          </button>
        </div>
      </div>

      {/* Row 1：搜索 + 模型查询 */}
      <div className="grid grid-cols-1 border-b-2 border-swiss-fg lg:grid-cols-2">
        <label className="flex min-w-0 items-center border-b-2 border-swiss-fg lg:border-b-0 lg:border-r-2">
          <span className="flex h-full w-12 shrink-0 items-center justify-center border-r border-swiss-fg bg-swiss-muted">
            <IconSearch className="h-5 w-5" />
          </span>
          <input
            value={state.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="搜索名称、域名或备注"
            className="min-w-0 flex-1 bg-swiss-bg px-3 py-3 font-mono text-sm outline-none focus:bg-swiss-muted"
          />
          {state.search && (
            <button type="button" onClick={() => onChange({ search: "" })} className="h-full border-l border-swiss-fg px-3" aria-label="清空搜索">
              <IconClose className="h-4 w-4" />
            </button>
          )}
        </label>

        <label className="flex items-center border-b-2 border-swiss-fg lg:border-b-0">
          <span className="px-3 font-mono text-sm uppercase tracking-widest text-swiss-fg/50">模型</span>
          <input
            value={state.modelQuery}
            onChange={(event) => onChange({ modelQuery: event.target.value })}
            list="relay-model-options"
            placeholder="输入模型，如 gpt-5.4"
            className="min-w-0 flex-1 bg-swiss-bg px-2 py-3 font-mono text-sm font-bold outline-none focus:bg-swiss-muted"
          />
          <datalist id="relay-model-options">
            {modelNames.map((name) => <option key={name} value={name} />)}
          </datalist>
          {state.modelQuery && (
            <button type="button" onClick={() => onChange({ modelQuery: "" })} className="h-full border-l border-swiss-fg px-3" aria-label="清空模型">
              <IconClose className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      {/* Row 2: Provider 多选 + 倍率 slider + 可用率门槛 */}
      <div className="grid grid-cols-1 gap-px bg-swiss-fg lg:grid-cols-3">
        {/* Provider 多选 */}
        <div className="bg-swiss-bg p-4">
          <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">Provider</div>
          <div className="mt-2 flex flex-wrap gap-1">
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
                  className={`border px-2 py-1 font-mono text-sm font-black ${selected ? "border-swiss-fg bg-swiss-fg text-swiss-bg" : "border-swiss-fg/40 hover:border-swiss-fg"}`}
                >
                  {p}
                </button>
              );
            })}
            {state.providers.length > 0 && (
              <button type="button" onClick={() => onChange({ providers: [] })} className="border border-swiss-fg/30 px-2 py-1 font-mono text-sm hover:border-swiss-fg">
                × 清
              </button>
            )}
          </div>
        </div>

        {/* 倍率区间 slider */}
        <div className="bg-swiss-bg p-4">
          <div className="flex items-baseline justify-between font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">
            <span>最低倍率上限</span>
            <span className="text-swiss-fg">≤ {state.rateMax.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={state.rateMax}
            onChange={(event) => onChange({ rateMax: Number(event.target.value) })}
            className="mt-3 w-full accent-swiss-fg"
          />
          <div className="mt-1 flex justify-between font-mono text-sm text-swiss-fg/45">
            <span>0x</span>
            <span>1x</span>
            <span>2x</span>
          </div>
        </div>

        {/* 可用率门槛 */}
        <div className="bg-swiss-bg p-4">
          <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">可用率门槛 (7d)</div>
          <div className="mt-2 flex gap-1">
            {[0, 90, 95, 98].map((threshold) => {
              const selected = state.availabilityThreshold === threshold;
              const label = threshold === 0 ? "全部" : `≥ ${threshold}%`;
              return (
                <button
                  key={threshold}
                  type="button"
                  onClick={() => onChange({ availabilityThreshold: threshold })}
                  className={`flex-1 border px-2 py-1 font-mono text-sm font-black ${selected ? "border-swiss-fg bg-swiss-fg text-swiss-bg" : "border-swiss-fg/40 hover:border-swiss-fg"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: 复选框 + 排序 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b-2 border-swiss-fg px-4 py-3 font-mono text-sm uppercase tracking-widest">
        <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={state.onlyMeasured} onChange={(event) => onChange({ onlyMeasured: event.target.checked })} className="h-4 w-4 accent-black" />有实测</label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={state.onlyModelData} onChange={(event) => onChange({ onlyModelData: event.target.checked })} className="h-4 w-4 accent-black" />有模型明细</label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={state.onlyRegistration} onChange={(event) => onChange({ onlyRegistration: event.target.checked })} className="h-4 w-4 accent-black" />可注册</label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={state.onlyNoVerify} onChange={(event) => onChange({ onlyNoVerify: event.target.checked })} className="h-4 w-4 accent-black" />免验证</label>
        <label className="ml-auto flex items-center gap-2">
          <span className="text-swiss-fg/55">排序</span>
          <select value={state.sortKey} onChange={(event) => onChange({ sortKey: event.target.value as FilterState["sortKey"] })} className="appearance-none border border-swiss-fg bg-swiss-bg px-2 py-1.5 font-mono text-sm font-black outline-none">
            <option value="availability">7 日可用率</option>
            <option value="rate">{state.modelQuery ? "原始费率参考" : "全站最低（参考）"}</option>
            <option value="updated">最近检查</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button type="button" onClick={onClearFilters} className="border-b border-swiss-fg font-black hover:text-swiss-accent">清除筛选</button>
        )}
      </div>
    </section>
  );
}
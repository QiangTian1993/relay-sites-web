// AI 编程工具 Explorer —— 列表 + 筛选 + 排序 + 对比
// 镜像 relay-sites-explorer 的 Swiss 风格（PRD 中转站 A 方案）

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconClose,
  IconPlus,
  IconStar,
} from "../icons";
import { buildToolRow, scoreTone, type ToolRow } from "@/lib/tools-types";

interface Props {
  records: import("@/lib/types").KeyedRecord[];
}

const PAGE_SIZE = 24;

export function ToolsExplorer({ records }: Props) {
  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [myState, setMyState] = useState("");
  const [scoreMin, setScoreMin] = useState(0);
  const [preset, setPreset] = useState<"all" | "gui" | "cli" | "free" | "multi_agent">("all");
  const [sortKey, setSortKey] = useState<"score" | "name" | "vendor">("score");
  const [page, setPage] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const rows = useMemo<ToolRow[]>(() => records.map(buildToolRow), [records]);
  const activityRows = useMemo(() => rows.filter((row) => row.activityBenefit), [rows]);


  const allTypes = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.types.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [rows]);

  const allPlatforms = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.platforms.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [rows]);

  const allMyStates = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.myState && s.add(r.myState));
    return [...s].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const result = rows.filter((r) => {
      // 场景快捷筛选
      if (preset === "gui") {
        const isGui = r.types.some(t => /IDE|插件|编辑器/i.test(t)) || /IDE|VS Code/i.test(r.advantages + r.note);
        if (!isGui) return false;
      }
      if (preset === "cli") {
        const isCli = r.types.some(t => /CLI|终端|命令行/i.test(t)) || /CLI|命令行|terminal/i.test(r.advantages + r.name + r.note);
        if (!isCli) return false;
      }
      if (preset === "free") {
        const isFree = /免费|开源|Free/i.test(r.pricing + r.advantages + r.note);
        if (!isFree) return false;
      }
      if (preset === "multi_agent") {
        const isMulti = r.multiAgent === "支持" || r.multiAgent === "是" || /multi-agent|多agent|双Agent/i.test(r.advantages + r.note);
        if (!isMulti) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const blob = `${r.name} ${r.vendor} ${r.advantages} ${r.disadvantages} ${r.note}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (types.length > 0 && !r.types.some((t) => types.includes(t))) return false;
      if (platforms.length > 0 && !r.platforms.some((p) => platforms.includes(p))) return false;
      if (myState && r.myState !== myState) return false;
      if (scoreMin > 0 && r.score < scoreMin) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sortKey === "score") return b.score - a.score;
      if (sortKey === "name") return a.name.localeCompare(b.name, "zh-CN");
      return a.vendor.localeCompare(b.vendor, "zh-CN");
    });
    return result;
  }, [rows, preset, search, types, platforms, myState, scoreMin, sortKey]);

  useEffect(() => setPage(0), [search, types, platforms, myState, scoreMin, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const comparedRows = compareIds.flatMap((id) => rows.filter((r) => r.id === id));
  const hasActiveFilters = Boolean(search || types.length > 0 || platforms.length > 0 || myState || scoreMin > 0);

  function clearFilters() {
    setSearch("");
    setTypes([]);
    setPlatforms([]);
    setMyState("");
    setScoreMin(0);
    setPreset("all");
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  return (
    <div className={`flex flex-col gap-5 ${compareIds.length > 0 ? "pb-24" : ""}`}>
      {/* 场景 Quick Presets */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 font-sans text-xs">
        {[
          { id: "all", label: "全量编程工具", desc: "查看 42 款全量工具列表" },
          { id: "gui", label: "GUI AI 桌面/IDE", desc: "Cursor, Trae, Windsurf 等" },
          { id: "cli", label: "终端/CLI Agent", desc: "Claude Code, Aider 等命令行工具" },
          { id: "free", label: "免费/开源选型", desc: "免费使用或支持开源部署的工具" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreset(item.id as any)}
            className={`rounded-2xl border p-4 text-left transition-all shadow-xs ${
              preset === item.id
                ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                : "border-zinc-200/80 bg-white hover:border-zinc-300 text-zinc-800"
            }`}
          >
            <div className="font-bold tracking-tight text-sm">{item.label}</div>
            <div className={`mt-1 text-xs ${preset === item.id ? "text-zinc-300" : "text-zinc-400"}`}>{item.desc}</div>
          </button>
        ))}
      </div>

      {activityRows.length > 0 && (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 pb-3 mb-3 text-amber-950">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800">活动权益 / Membership Offers</span>
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800">{activityRows.length} 条</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {activityRows.map((row) => (
              <Link key={row.id} href={`/table/vibe_coding_tracker/${encodeURIComponent(row.id)}`} className="rounded-xl border border-amber-200/60 bg-white p-4 transition-all hover:shadow-xs hover:border-amber-300">
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="font-bold text-zinc-900">{row.name}</strong>
                  <span className="font-mono text-xs font-semibold text-[#E03E1A]">查看详情 →</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-600">{row.activityBenefit}</p>
                {row.activityPeriod && <div className="mt-2 font-mono text-[11px] text-zinc-400">{row.activityPeriod}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-700">
            <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">FILTER</span>
            <span>工具筛选</span>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            {filteredRows.length} / {rows.length} 款工具
          </span>
        </div>

        {/* Row 1: 搜索 + 排序 */}
        <div className="grid grid-cols-1 border-b border-zinc-100 sm:grid-cols-3">
          <label className="flex min-w-0 items-center border-b border-zinc-100 sm:col-span-2 sm:border-b-0 sm:border-r">
            <span className="flex h-full w-10 shrink-0 items-center justify-center font-mono text-xs text-zinc-400">Q</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索名称 / 厂商 / 优势 / 备注..."
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-xs outline-none placeholder:text-zinc-400"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="h-full px-3 text-zinc-400 hover:text-zinc-600" aria-label="清空搜索">
                <IconClose className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="font-mono text-xs font-medium text-zinc-400 uppercase tracking-wider">排序</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-zinc-800 outline-none shadow-2xs"
            >
              <option value="score">评分 ↓</option>
              <option value="name">名称 A-Z</option>
              <option value="vendor">厂商 A-Z</option>
            </select>
          </div>
        </div>

        {/* Row 2: 评分门槛 + 我的状态 */}
        <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:divide-y-0 sm:divide-x sm:grid-cols-2 border-b border-zinc-100">
          <div className="p-4">
            <div className="flex items-baseline justify-between font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>评分门槛</span>
              <span className="text-zinc-900 font-bold">≥ {scoreMin} 星</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={scoreMin}
              onChange={(e) => setScoreMin(Number(e.target.value))}
              className="mt-3 w-full accent-zinc-900"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-zinc-400">
              <span>0 (不限)</span><span>3 星</span><span>5 星</span>
            </div>
          </div>
          <div className="p-4">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">我的状态</div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMyState("")}
                className={`rounded-full px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                  myState === ""
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                全部
              </button>
              {allMyStates.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMyState(s)}
                  className={`rounded-full px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                    myState === s
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: 类型 + 平台 */}
        <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:divide-y-0 sm:divide-x sm:grid-cols-2">
          <MultiSelectField label="类型" options={allTypes} selected={types} onChange={setTypes} />
          <MultiSelectField label="平台" options={allPlatforms} selected={platforms} onChange={setPlatforms} />
        </div>

        {/* Row 4: 清除按钮 */}
        {hasActiveFilters && (
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-2 text-right">
            <button type="button" onClick={clearFilters} className="font-mono text-xs font-semibold text-[#E03E1A] hover:underline">
              清除筛选条件
            </button>
          </div>
        )}
      </section>

      {/* 列表行 */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-100">
          {pageRows.map((row) => (
            <ToolListRow
              key={row.id}
              row={row}
              selected={compareIds.includes(row.id)}
              compareDisabled={compareIds.length >= 4 && !compareIds.includes(row.id)}
              onToggleCompare={() => toggleCompare(row.id)}
            />
          ))}
        </div>
        {pageRows.length === 0 && (
          <div className="p-16 text-center font-mono text-xs uppercase tracking-wider text-zinc-400">没有符合条件的工具</div>
        )}
        {pageCount > 1 && (
          <footer className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 font-mono text-xs text-zinc-500">
            <span>{safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length)} / {filteredRows.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, safePage - 1))}
                disabled={safePage === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white disabled:opacity-30 shadow-2xs hover:bg-zinc-50"
                aria-label="上一页"
              >
                <IconArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-semibold text-zinc-700">{safePage + 1} / {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                disabled={safePage >= pageCount - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white disabled:opacity-30 shadow-2xs hover:bg-zinc-50"
                aria-label="下一页"
              >
                <IconArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* Compare Tray */}
      {compareIds.length > 0 && (
        <CompareTray
          rows={comparedRows}
          onRemove={toggleCompare}
          onClear={() => setCompareIds([])}
          onOpen={() => setCompareOpen(true)}
        />
      )}

      {/* Compare Panel */}
      {compareOpen && comparedRows.length >= 2 && (
        <ComparePanel rows={comparedRows} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}

// ============= 列表行 =============

function ToolListRow({ row, selected, compareDisabled, onToggleCompare }: {
  row: ToolRow;
  selected: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
}) {
  const isActive = row.myState === "在用";
  const tone = scoreTone(row.score);
  const scoreClasses =
    tone === "high" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "medium" ? "border-zinc-200 bg-zinc-100 text-zinc-800"
    : "border-zinc-200 bg-zinc-50 text-zinc-400";
  const stars = row.githubStars ?? row.stars;

  return (
    <article className={`flex transition-colors hover:bg-zinc-50/70 ${selected ? "bg-zinc-50/90" : ""}`}>
      {/* Left accent rail */}
      <div className={`w-1 shrink-0 ${isActive ? "bg-[#E03E1A]" : "bg-transparent"}`} />

      {/* Content zone */}
      <div className="min-w-0 flex-1 px-5 py-4">
        {/* Row 1: name + vendor + type tags */}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <Link
            href={`/table/vibe_coding_tracker/${encodeURIComponent(row.id)}`}
            className="text-base font-bold text-zinc-900 hover:text-[#E03E1A] transition-colors"
          >
            {row.name}
          </Link>
          <span className="font-mono text-xs text-zinc-400">{row.vendor}</span>
          {row.types.map((t) => (
            <span key={t} className="rounded-md border border-zinc-200/70 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-600 shadow-2xs">
              {t}
            </span>
          ))}
        </div>

        {/* Row 2: advantages */}
        {row.advantages && (
          <p className="mt-1.5 line-clamp-2 max-w-3xl text-xs leading-relaxed text-zinc-500">
            {row.advantages}
          </p>
        )}
        {row.activityBenefit && (
          <div className="mt-2.5 flex flex-wrap items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/40 px-3 py-2">
            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800">活动权益</span>
            <span className="min-w-0 text-xs leading-relaxed text-amber-950 font-medium">{row.activityBenefit}</span>
          </div>
        )}

        {/* Row 3: meta chips */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-zinc-400">
          {row.platforms.length > 0 && (
            <span>{row.platforms.slice(0, 3).join(" · ")}{row.platforms.length > 3 ? ` +${row.platforms.length - 3}` : ""}</span>
          )}
          {stars != null && (
            <span>★ {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}</span>
          )}
          {row.pricing && row.pricing !== "未标注" && <span>{row.pricing}</span>}
          {(row.multiAgent === "支持" || row.multiAgent === "是") && (
            <span className="font-semibold text-zinc-700">Multi-Agent ✓</span>
          )}
        </div>
      </div>

      {/* Right zone: score + state + compare */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-l border-zinc-100 px-4 py-4 min-w-[96px]">
        <div className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${scoreClasses}`}>
          {row.scoreLabel}
        </div>
        {isActive && (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">在用</span>
        )}
        {row.myState === "待调研" && (
          <span className="font-mono text-[10px] text-zinc-400">待调研</span>
        )}
        {row.myState === "弃用" && (
          <span className="font-mono text-[10px] text-zinc-400 line-through">弃用</span>
        )}
        <button
          type="button"
          onClick={onToggleCompare}
          disabled={compareDisabled}
          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors shadow-2xs disabled:cursor-not-allowed disabled:opacity-20 ${
            selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
          aria-label={selected ? `移出对比 ${row.name}` : `加入对比 ${row.name}`}
        >
          {selected ? <IconCheck className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
        </button>
      </div>
    </article>
  );
}

// ============= 多选字段 =============

function MultiSelectField({ label, options, selected, onChange }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) return <div className="p-4"><div className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</div><div className="mt-2 font-mono text-xs text-zinc-400">--</div></div>;
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <span>{label}</span>
        {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="font-mono text-xs text-[#E03E1A] hover:underline">× 清空</button>}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                const next = isSelected ? selected.filter((x) => x !== opt) : [...selected, opt];
                onChange(next);
              }}
              className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-zinc-900 text-white font-semibold"
                  : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============= 对比栏 =============

function CompareTray({ rows, onRemove, onClear, onOpen }: {
  rows: ToolRow[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  return (
    <aside className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">已选</span>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {rows.map((row) => (
            <span key={row.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
              {row.name}
              <button type="button" onClick={() => onRemove(row.id)} className="text-zinc-400 hover:text-zinc-700">
                <IconClose className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <button type="button" onClick={onClear} className="font-mono text-xs text-zinc-400 hover:text-zinc-700">清空</button>
        <button
          type="button"
          onClick={onOpen}
          disabled={rows.length < 2}
          className="rounded-xl bg-zinc-900 px-3.5 py-1.5 font-mono text-xs font-bold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-40"
        >
          对比 ({rows.length})
        </button>
      </div>
    </aside>
  );
}

// ============= 对比面板 =============

function ComparePanel({ rows, onClose }: { rows: ToolRow[]; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);
  const columns = `120px repeat(${rows.length}, minmax(200px, 1fr))`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <section role="dialog" aria-modal="true" aria-label="工具对比" className="mx-auto flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-zinc-200/80 bg-white shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-5 py-4">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">候选对比</div>
            <h2 className="text-base font-bold text-zinc-900">AI 编程工具对比</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100" aria-label="关闭">
            <IconClose className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-auto p-4">
          <div className="grid min-w-max rounded-xl border border-zinc-200/80 overflow-hidden divide-y divide-zinc-100" style={{ gridTemplateColumns: columns }}>
            <div className="bg-zinc-50/80 p-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-500 border-r border-zinc-100">工具</div>
            {rows.map((row) => (
              <div key={row.id} className="p-3 border-r border-zinc-100 last:border-r-0 bg-white">
                <Link href={`/table/vibe_coding_tracker/${encodeURIComponent(row.id)}`} className="text-sm font-bold text-zinc-900 hover:text-[#E03E1A] transition-colors">{row.name}</Link>
                <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-400">{row.vendor}</div>
              </div>
            ))}
            <Cmp label="评分" rows={rows} render={(r) => r.scoreLabel} />
            <Cmp label="厂商" rows={rows} render={(r) => r.vendor} />
            <Cmp label="类型" rows={rows} render={(r) => r.types.join(" · ")} />
            <Cmp label="平台" rows={rows} render={(r) => r.platforms.join(" · ")} />
            <Cmp label="我的状态" rows={rows} render={(r) => r.myState || "--"} />
            <Cmp label="支持模型" rows={rows} render={(r) => r.supportedModels.join(" · ")} />
            <Cmp label="定价" rows={rows} render={(r) => r.pricing} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Cmp({ label, rows, render }: { label: string; rows: ToolRow[]; render: (r: ToolRow) => string }) {
  return (
    <>
      <div className="bg-zinc-50/50 p-3 font-mono text-xs font-semibold text-zinc-500 border-r border-zinc-100">{label}</div>
      {rows.map((row) => (
        <div key={row.id} className="p-3 text-xs leading-relaxed text-zinc-700 border-r border-zinc-100 last:border-r-0 bg-white">{render(row)}</div>
      ))}
    </>
  );
}
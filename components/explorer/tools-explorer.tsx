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
    <div className={`flex flex-col gap-5 ${compareIds.length > 0 ? "pb-20" : ""}`}>
      {/* 场景 Quick Presets */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
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
            className={`border-2 p-3 text-left transition-colors ${
              preset === item.id ? "border-swiss-fg bg-swiss-fg text-swiss-bg" : "border-swiss-fg/25 bg-white hover:border-swiss-fg"
            }`}
          >
            <div className="font-black uppercase">{item.label}</div>
            <div className={`mt-1 text-[11px] ${preset === item.id ? "text-swiss-bg/70" : "text-swiss-fg/50"}`}>{item.desc}</div>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <section className="border-2 border-swiss-fg bg-swiss-bg">
        <div className="flex flex-wrap items-stretch border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
          <div className="flex min-w-[220px] flex-1 items-center gap-3 px-4 py-2.5 font-mono text-sm font-black uppercase tracking-widest">
            <span>工具筛选</span>
            <span className="ml-auto font-mono text-sm font-black text-swiss-bg/55">{filteredRows.length} / {rows.length}</span>
          </div>
        </div>

        {/* Row 1: 搜索 + 评分门槛 + 排序 */}
        <div className="grid grid-cols-1 border-b-2 border-swiss-fg sm:grid-cols-3">
          <label className="flex min-w-0 items-center border-b-2 border-swiss-fg sm:col-span-2 sm:border-b-0 sm:border-r-2">
            <span className="flex h-full w-12 shrink-0 items-center justify-center border-r border-swiss-fg bg-swiss-muted font-mono text-sm font-black">Q</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索名称 / 厂商 / 优势 / 备注"
              className="min-w-0 flex-1 bg-swiss-bg px-3 py-3 font-mono text-sm outline-none focus:bg-swiss-muted"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="h-full border-l border-swiss-fg px-3" aria-label="清空搜索">
                <IconClose className="h-4 w-4" />
              </button>
            )}
          </label>
          <label className="flex items-center">
            <span className="px-3 font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">排序</span>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)} className="min-w-0 flex-1 appearance-none bg-swiss-bg px-2 py-3 font-mono text-sm font-black outline-none">
              <option value="score">评分 ↓</option>
              <option value="name">名称 A-Z</option>
              <option value="vendor">厂商 A-Z</option>
            </select>
          </label>
        </div>

        {/* Row 2: 评分门槛 + 我的状态（短项） */}
        <div className="grid grid-cols-1 gap-px bg-swiss-fg sm:grid-cols-2">
          <div className="bg-swiss-bg p-4">
            <div className="flex items-baseline justify-between font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">
              <span>评分门槛</span>
              <span className="text-swiss-fg">≥ {scoreMin}</span>
            </div>
            <input type="range" min={0} max={5} step={1} value={scoreMin} onChange={(e) => setScoreMin(Number(e.target.value))} className="mt-3 w-full accent-swiss-fg" />
            <div className="mt-1 flex justify-between font-mono text-sm text-swiss-fg/45">
              <span>0</span><span>3</span><span>5</span>
            </div>
          </div>
          <div className="bg-swiss-bg p-4">
            <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">我的状态</div>
            <div className="mt-3 flex flex-wrap gap-1">
              <button type="button" onClick={() => setMyState("")} className={`border px-2 py-1 font-mono text-sm font-black ${myState === "" ? "border-swiss-fg bg-swiss-fg text-swiss-bg" : "border-swiss-fg/40 hover:border-swiss-fg"}`}>全部</button>
              {allMyStates.map((s) => (
                <button key={s} type="button" onClick={() => setMyState(s)} className={`border px-2 py-1 font-mono text-sm font-black ${myState === s ? "border-swiss-fg bg-swiss-fg text-swiss-bg" : "border-swiss-fg/40 hover:border-swiss-fg"}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: 类型 + 平台（多选） */}
        <div className="grid grid-cols-1 gap-px bg-swiss-fg sm:grid-cols-2">
          <MultiSelectField label="类型" options={allTypes} selected={types} onChange={setTypes} />
          <MultiSelectField label="平台" options={allPlatforms} selected={platforms} onChange={setPlatforms} />
        </div>

        {/* Row 4: 清除按钮 */}
        {hasActiveFilters && (
          <div className="border-t-2 border-swiss-fg px-4 py-2 text-right">
            <button type="button" onClick={clearFilters} className="font-mono text-sm font-black hover:text-swiss-accent">
              清除筛选
            </button>
          </div>
        )}
      </section>

      {/* 列表行 */}
      <section className="border-2 border-swiss-fg bg-swiss-bg">
        <div className="divide-y-2 divide-swiss-fg">
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
          <div className="p-16 text-center font-mono text-sm uppercase tracking-widest text-swiss-fg/40">没有符合条件的工具</div>
        )}
        {pageCount > 1 && (
          <footer className="flex items-center justify-between border-t-2 border-swiss-fg bg-swiss-muted px-4 py-3 font-mono text-sm uppercase tracking-widest">
            <span>{safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length)} / {filteredRows.length}</span>
            <div className="flex items-center border border-swiss-fg bg-swiss-bg">
              <button type="button" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} className="flex h-11 w-11 items-center justify-center disabled:opacity-20 sm:h-8 sm:w-9" aria-label="上一页"><IconArrowLeft className="h-4 w-4" /></button>
              <span className="border-x border-swiss-fg px-3 py-2 font-black">{safePage + 1} / {pageCount}</span>
              <button type="button" onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))} disabled={safePage >= pageCount - 1} className="flex h-11 w-11 items-center justify-center disabled:opacity-20 sm:h-8 sm:w-9" aria-label="下一页"><IconArrowRight className="h-4 w-4" /></button>
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
    tone === "high" ? "border-swiss-accent bg-swiss-accent text-swiss-bg"
    : tone === "medium" ? "border-swiss-fg bg-swiss-fg text-swiss-bg"
    : "border-swiss-fg/30 text-swiss-fg/40";
  const stars = row.githubStars ?? row.stars;

  return (
    <article className={`flex transition-colors hover:bg-swiss-muted ${selected ? "bg-swiss-muted" : ""}`}>
      {/* Left accent rail — accent for 在用, invisible otherwise */}
      <div className={`w-[3px] shrink-0 ${isActive ? "bg-swiss-accent" : ""}`} />

      {/* Content zone */}
      <div className="min-w-0 flex-1 px-5 py-4">
        {/* Row 1: name + vendor + type tags */}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            href={`/table/vibe_coding_tracker/${encodeURIComponent(row.id)}`}
            className="text-lg font-black leading-tight hover:text-swiss-accent"
          >
            {row.name}
          </Link>
          <span className="font-mono text-sm text-swiss-fg/45">{row.vendor}</span>
          {row.types.map((t) => (
            <span key={t} className="border border-swiss-fg/25 px-1.5 py-0.5 font-mono text-xs font-bold">
              {t}
            </span>
          ))}
        </div>

        {/* Row 2: advantages */}
        {row.advantages && (
          <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-relaxed text-swiss-fg/55">
            {row.advantages}
          </p>
        )}

        {/* Row 3: meta chips */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-swiss-fg/40">
          {row.platforms.length > 0 && (
            <span>{row.platforms.slice(0, 3).join(" · ")}{row.platforms.length > 3 ? ` +${row.platforms.length - 3}` : ""}</span>
          )}
          {stars != null && (
            <span>★ {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}</span>
          )}
          {row.pricing && row.pricing !== "未标注" && <span>{row.pricing}</span>}
          {(row.multiAgent === "支持" || row.multiAgent === "是") && (
            <span className="font-bold text-swiss-fg/60">Multi-Agent ✓</span>
          )}
        </div>
      </div>

      {/* Right zone: score + state + compare */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-l border-swiss-fg/10 px-4 py-4 min-w-[96px]">
        <div className={`border-2 px-2.5 py-1 font-mono text-sm font-black ${scoreClasses}`}>
          {row.scoreLabel}
        </div>
        {isActive && (
          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-swiss-accent">在用</span>
        )}
        {row.myState === "待调研" && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-swiss-fg/35">待调研</span>
        )}
        {row.myState === "弃用" && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-swiss-fg/25 line-through">弃用</span>
        )}
        <button
          type="button"
          onClick={onToggleCompare}
          disabled={compareDisabled}
          className={`flex h-7 w-7 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-20 ${
            selected ? "border-swiss-fg bg-swiss-fg text-swiss-bg" : "border-swiss-fg/40 hover:border-swiss-fg hover:bg-swiss-fg hover:text-swiss-bg"
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
  if (options.length === 0) return <div className="bg-swiss-bg p-4"><div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">{label}</div><div className="mt-2 font-mono text-sm text-swiss-fg/45">--</div></div>;
  return (
    <div className="bg-swiss-bg p-4">
      <div className="flex items-baseline justify-between font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">
        <span>{label}</span>
        {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="font-mono text-sm text-swiss-fg/55 hover:text-swiss-accent">× 清</button>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
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
              className={`border px-2 py-1 font-mono text-sm font-black ${isSelected ? "border-swiss-fg bg-swiss-fg text-swiss-bg" : "border-swiss-fg/40 hover:border-swiss-fg"}`}
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
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-swiss-fg bg-swiss-bg">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="hidden font-mono text-sm font-black uppercase tracking-widest sm:block">候选工具</div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {rows.map((row) => (
            <span key={row.id} className="inline-flex shrink-0 items-center gap-2 border border-swiss-fg bg-swiss-muted px-2 py-1.5 text-sm font-bold">
              {row.name}
              <button type="button" onClick={() => onRemove(row.id)} className="flex h-11 w-11 items-center justify-center sm:h-7 sm:w-7" aria-label={`移出对比 ${row.name}`}><IconClose className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
        <button type="button" onClick={onClear} className="min-h-11 shrink-0 font-mono text-sm font-black underline">清空</button>
        <button type="button" onClick={onOpen} disabled={rows.length < 2} className="min-h-11 shrink-0 bg-swiss-fg px-4 py-2.5 text-sm font-black text-swiss-bg disabled:cursor-not-allowed disabled:opacity-30">
          对比 {rows.length} 个工具
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-0 sm:items-center sm:p-6">
      <section role="dialog" aria-modal="true" aria-label="工具对比" className="mx-auto flex max-h-[92vh] w-full max-w-6xl flex-col border-2 border-swiss-fg bg-swiss-bg">
        <header className="flex items-center border-b-2 border-swiss-fg bg-swiss-fg px-4 py-3 text-swiss-bg">
          <div>
            <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-bg/55">候选对比</div>
            <h2 className="text-lg font-black">AI 编程工具</h2>
          </div>
          <button type="button" onClick={onClose} className="ml-auto flex h-11 w-11 items-center justify-center border border-swiss-bg sm:h-9 sm:w-9" aria-label="关闭"><IconClose className="h-5 w-5" /></button>
        </header>
        <div className="overflow-auto">
          <div className="grid min-w-max" style={{ gridTemplateColumns: columns }}>
            <div className="border-b-2 border-r-2 border-swiss-fg bg-swiss-muted p-3 font-mono text-sm font-black uppercase tracking-widest">工具</div>
            {rows.map((row) => (
              <div key={row.id} className="border-b-2 border-r border-swiss-fg p-3 last:border-r-0">
                <Link href={`/table/vibe_coding_tracker/${encodeURIComponent(row.id)}`} className="text-base font-black hover:text-swiss-accent">{row.name}</Link>
                <div className="mt-1 truncate font-mono text-sm text-swiss-fg/50">{row.vendor}</div>
              </div>
            ))}
            <Cmp label="评分" rows={rows} render={(r) => r.scoreLabel} />
            <Cmp label="厂商" rows={rows} render={(r) => r.vendor} />
            <Cmp label="类型" rows={rows} render={(r) => r.types.join(" · ")} />
            <Cmp label="平台" rows={rows} render={(r) => r.platforms.join(" · ")} />
            <Cmp label="我的状态" rows={rows} render={(r) => r.myState} />
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
      <div className="border-b border-r-2 border-swiss-fg bg-swiss-muted p-3 font-mono text-sm font-black uppercase tracking-widest">{label}</div>
      {rows.map((row) => (
        <div key={row.id} className="border-b border-r border-swiss-fg p-3 text-sm leading-5 last:border-r-0">{render(row)}</div>
      ))}
    </>
  );
}
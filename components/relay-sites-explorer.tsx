// Explorer 主组件 —— 状态管理 + 筛选器 + 视图分发
// 行/徽章/对比 已拆到 components/explorer/{list-row, compare, types}.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { PROVIDERS, getRateForProvider } from "@/lib/matrix";
import { matchesSearch, toNumber } from "@/lib/record-utils";
import { matchesModel, modelOfferSortValue, parseAccessSignals } from "@/lib/relay-product";
import { ProviderMatrix } from "./provider-matrix";
import {
  BarChart3,
  IconArrowLeft,
  IconArrowRight,
  IconClose,
  IconLayoutList,
  IconSearch,
} from "./icons";
import {
  nullableNumberCompare,
  PAGE_SIZE,
  type ExplorerProps,
  type RelaySiteRow,
  type SortKey,
  type ViewMode,
} from "./explorer/types";
import { RelaySiteListRow } from "./explorer/list-row";
import { ComparePanel, CompareTray } from "./explorer/compare";
import { FilterBar, type FilterState } from "./explorer/filter-bar";
import { ModelView } from "./explorer/model-view";

/** 可点击排序的列头按钮（PRD F.02） */
function SortableHeader({ sortKey, currentSort, onSort, className = "", children }: {
  sortKey: SortKey;
  currentSort: SortKey;
  onSort: (k: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = currentSort === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`group flex items-center gap-1 px-4 py-2 text-left transition-colors hover:bg-swiss-fg hover:text-swiss-bg ${isActive ? "bg-swiss-fg text-swiss-bg" : ""} ${className}`}
      title={`按${children}排序`}
    >
      <span>{children}</span>
      <span className={`ml-auto text-[8px] transition-opacity ${isActive ? "opacity-100" : "opacity-30 group-hover:opacity-100"}`}>
        {isActive ? "▼" : "▾"}
      </span>
    </button>
  );
}

export function RelaySitesExplorer({ records, performanceRecords, modelOffers, groupRecords = [] }: ExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [rateMax, setRateMax] = useState(2);
  const [availabilityThreshold, setAvailabilityThreshold] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [onlyMeasured, setOnlyMeasured] = useState(false);
  const [onlyModelData, setOnlyModelData] = useState(false);
  const [onlyRegistration, setOnlyRegistration] = useState(false);
  const [onlyNoVerify, setOnlyNoVerify] = useState(false);
  const [page, setPage] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const perfBySiteId = useMemo(() => {
    const map = new Map<string, ExplorerProps["performanceRecords"][number]>();
    for (const record of performanceRecords) {
      const siteId = String(record.site_id ?? "");
      if (siteId) map.set(siteId, record);
    }
    return map;
  }, [performanceRecords]);

  const offersBySite = useMemo(() => {
    const map = new Map<string, ExplorerProps["modelOffers"]>();
    for (const offer of modelOffers) {
      const current = map.get(offer.siteRecordId) ?? [];
      current.push(offer);
      map.set(offer.siteRecordId, current);
    }
    return map;
  }, [modelOffers]);

  const groupsBySite = useMemo(() => {
    const map = new Map<string, ExplorerProps["records"]>();
    for (const g of groupRecords ?? []) {
      const sid = String(g.__siteId ?? g.site_id ?? "");
      if (!sid) continue;
      const list = map.get(sid) ?? [];
      list.push(g);
      map.set(sid, list);
    }
    return map;
  }, [groupRecords]);

  const modelNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const offer of modelOffers) counts.set(offer.name, (counts.get(offer.name) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [modelOffers]);

  const rows = useMemo<RelaySiteRow[]>(() => {
    return records.map((record) => {
      const siteId = String(record["站点ID"] ?? "");
      const note = String(record["备注"] ?? "");
      const lastChecked = String(record["最后检查"] ?? "");
      const parsedTime = lastChecked ? new Date(lastChecked).getTime() : Number.NaN;
      const siteOffers = offersBySite.get(record.__id) ?? [];
      const matchingOffers = modelQuery
        ? siteOffers.filter((offer) => matchesModel(offer, modelQuery))
        : [];
      const matchedModelOffer = [...matchingOffers].sort((a, b) => {
        const av = modelOfferSortValue(a);
        const bv = modelOfferSortValue(b);
        return nullableNumberCompare(av, bv, "asc");
      })[0] ?? null;
      return {
        record,
        siteId,
        name: String(record["名称"] ?? "未命名"),
        domain: String(record["域名"] ?? ""),
        providers: Array.isArray(record["支持的 provider"])
          ? (record["支持的 provider"] as string[])
          : record["支持的 provider"]
            ? [String(record["支持的 provider"])]
            : [],
        framework: Array.isArray(record["框架"])
          ? String(record["框架"][0] ?? "")
          : String(record["框架"] ?? ""),
        note,
        access: parseAccessSignals(note),
        minRate: toNumber(record["最低倍率"]),
        selectedRate: providers.length === 1 ? getRateForProvider(record["分组倍率"], providers[0]) : null,
        groupCount: Array.isArray(record["站点分组"]) ? record["站点分组"].length : 0,
        modelCount: siteOffers.length,
        lastChecked,
        lastCheckedMs: Number.isNaN(parsedTime) ? null : parsedTime,
        perf: perfBySiteId.get(siteId) ?? null,
        modelOffers: siteOffers,
        matchedModelOffer,
        groups: groupsBySite.get(record.__id) ?? [],
      };
    });
  }, [records, offersBySite, groupsBySite, perfBySiteId, providers, modelQuery]);

  const filteredRows = useMemo(() => {
    const result = rows.filter((row) => {
      if (!matchesSearch(row.record, search, ["名称", "域名", "备注", "支持的 provider"])) return false;
      if (modelQuery && !row.matchedModelOffer) return false;
      if (providers.length > 0 && !providers.some((p) => row.providers.includes(p))) return false;
      if (onlyMeasured && !row.perf) return false;
      if (onlyModelData && row.modelOffers.length === 0) return false;
      if (onlyRegistration && row.access.registration !== "open") return false;
      if (onlyNoVerify && row.access.verification !== "none") return false;
      // F.05: 倍率上限
      const rateForFilter = modelQuery ? (row.matchedModelOffer ? modelOfferSortValue(row.matchedModelOffer) : null) : providers.length === 1 ? row.selectedRate : row.minRate;
      if (rateMax < 2 && rateForFilter != null && rateForFilter > rateMax) return false;
      // F.05: 可用率门槛
      const a7 = toNumber(row.perf?.availability_7d);
      if (availabilityThreshold > 0 && (a7 == null || a7 < availabilityThreshold)) return false;
      return true;
    });

    return result.sort((a, b) => {
      let order = 0;
      if (sortKey === "rate") {
        const aRate = modelQuery ? (a.matchedModelOffer ? modelOfferSortValue(a.matchedModelOffer) : null) : providers.length === 1 ? a.selectedRate : a.minRate;
        const bRate = modelQuery ? (b.matchedModelOffer ? modelOfferSortValue(b.matchedModelOffer) : null) : providers.length === 1 ? b.selectedRate : b.minRate;
        order = nullableNumberCompare(aRate, bRate, "asc");
      } else if (sortKey === "availability") {
        order = nullableNumberCompare(toNumber(a.perf?.availability_7d), toNumber(b.perf?.availability_7d), "desc");
      } else if (sortKey === "ttft") {
        order = nullableNumberCompare(toNumber(a.perf?.ttft_p50_ms), toNumber(b.perf?.ttft_p50_ms), "asc");
      } else {
        order = nullableNumberCompare(a.lastCheckedMs, b.lastCheckedMs, "desc");
      }
      return order || a.name.localeCompare(b.name, "zh-CN");
    });
  }, [rows, search, modelQuery, providers, rateMax, availabilityThreshold, onlyMeasured, onlyModelData, onlyRegistration, onlyNoVerify, sortKey]);

  useEffect(() => {
    setPage(0);
  }, [search, modelQuery, providers, rateMax, availabilityThreshold, onlyMeasured, onlyModelData, onlyRegistration, onlyNoVerify, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const filteredRecords = filteredRows.map((row) => row.record);
  const hasActiveFilters = Boolean(search || modelQuery || providers.length > 0 || rateMax < 2 || availabilityThreshold > 0 || onlyMeasured || onlyModelData || onlyRegistration || onlyNoVerify);
  const comparedRows = compareIds.flatMap((id) => {
    const row = rows.find((item) => item.record.__id === id);
    return row ? [row] : [];
  });

  function clearFilters() {
    setSearch("");
    setModelQuery("");
    setProviders([]);
    setRateMax(2);
    setAvailabilityThreshold(0);
    setOnlyMeasured(false);
    setOnlyModelData(false);
    setOnlyRegistration(false);
    setOnlyNoVerify(false);
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  return (
    <div className={`flex flex-col gap-5 ${compareIds.length > 0 ? "pb-20" : ""}`}>
      <FilterBar
        state={{
          search,
          modelQuery,
          providers,
          rateMax,
          availabilityThreshold,
          sortKey,
          onlyMeasured,
          onlyModelData,
          onlyRegistration,
          onlyNoVerify,
        }}
        modelNames={modelNames}
        filteredCount={filteredRows.length}
        totalCount={records.length}
        viewMode={viewMode}
        onChange={(next) => {
          if (next.search !== undefined) setSearch(next.search);
          if (next.modelQuery !== undefined) setModelQuery(next.modelQuery);
          if (next.providers !== undefined) setProviders(next.providers);
          if (next.rateMax !== undefined) setRateMax(next.rateMax);
          if (next.availabilityThreshold !== undefined) setAvailabilityThreshold(next.availabilityThreshold);
          if (next.sortKey !== undefined) setSortKey(next.sortKey as SortKey);
          if (next.onlyMeasured !== undefined) setOnlyMeasured(next.onlyMeasured);
          if (next.onlyModelData !== undefined) setOnlyModelData(next.onlyModelData);
          if (next.onlyRegistration !== undefined) setOnlyRegistration(next.onlyRegistration);
          if (next.onlyNoVerify !== undefined) setOnlyNoVerify(next.onlyNoVerify);
        }}
        onClearFilters={clearFilters}
        onViewModeChange={setViewMode}
      />
      {viewMode === "model" && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-swiss-fg bg-swiss-muted px-4 py-3 font-mono text-sm">
          <span><strong>模型覆盖</strong> 只回答“哪些站支持”，这里的费率是原始参考值。</span>
          <a href="/relay" className="border-2 border-swiss-fg bg-swiss-fg px-3 py-2 font-black text-swiss-bg transition-colors hover:bg-swiss-accent">去模型比价 →</a>
        </div>
      )}

      {viewMode === "model" ? (
        <ModelView
          modelQuery={modelQuery}
          modelNames={modelNames}
          onModelChange={setModelQuery}
          offersBySite={offersBySite}
          sitesById={new Map(records.map((r) => [String(r.__id), r]))}
          perfBySiteId={perfBySiteId}
          domainBySite={new Map(records.map((r) => [String(r.__id), String(r["域名"] ?? "")]))}
        />
      ) : viewMode === "matrix" ? (
        <ProviderMatrix records={filteredRecords} />
      ) : (
        <section className="border-2 border-swiss-fg bg-swiss-bg">
          <div className="hidden grid-cols-[minmax(220px,1.35fr)_minmax(230px,1.35fr)_minmax(170px,1fr)_minmax(190px,1fr)_105px_42px] border-b-2 border-swiss-fg bg-swiss-muted font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55 lg:grid">
            <SortableHeader sortKey="updated" currentSort={sortKey} onSort={setSortKey}>
              站点
            </SortableHeader>
            <span className="border-l border-swiss-fg/30 px-4 py-2">{modelQuery ? "目标模型 / 价格" : "Provider / 倍率"}</span>
            <SortableHeader sortKey="availability" currentSort={sortKey} onSort={setSortKey} className="border-l border-swiss-fg/30">
              稳定性
            </SortableHeader>
            <span className="border-l border-swiss-fg/30 px-4 py-2">接入状态</span>
            <SortableHeader sortKey="updated" currentSort={sortKey} onSort={setSortKey} className="border-l border-swiss-fg/30">
              更新
            </SortableHeader>
            <span className="border-l border-swiss-fg/30" />
          </div>

          <div className="divide-y-2 divide-swiss-fg">
            {pageRows.map((row) => (
              <RelaySiteListRow
                key={row.record.__id}
                row={row}
                selectedProvider={providers[0] ?? ""}
                modelQuery={modelQuery}
                selected={compareIds.includes(row.record.__id)}
                compareDisabled={compareIds.length >= 4 && !compareIds.includes(row.record.__id)}
                onToggleCompare={() => toggleCompare(row.record.__id)}
              />
            ))}
          </div>

          {pageRows.length === 0 && (
            <div className="p-16 text-center font-mono text-sm uppercase tracking-widest text-swiss-fg/40">没有符合条件的站点</div>
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
      )}

      {compareIds.length > 0 && (
        <CompareTray
          rows={comparedRows}
          onRemove={toggleCompare}
          onClear={() => setCompareIds([])}
          onOpen={() => setCompareOpen(true)}
        />
      )}

      {compareOpen && (
        <ComparePanel
          rows={comparedRows}
          modelQuery={modelQuery}
          provider={providers[0] ?? ""}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}
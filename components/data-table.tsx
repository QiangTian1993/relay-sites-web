// Swiss Style Data Table —— 严格矩形 + 固定高度 + 表头 sticky

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TableConfig } from "@/lib/tables";
import type { KeyedRecord } from "@/lib/types";
import { renderCell } from "./cell-renderer";
import { FilterBar, type FilterState } from "./filter-bar";
import { matchesSearch, toNumber } from "@/lib/record-utils";
import {
  IconClose,
  IconSum,
  IconArrowUp,
  IconArrowDown,
  IconEmpty,
  IconArrowLeft,
  IconArrowRight,
} from "./icons";

interface Props {
  table: TableConfig;
  records: KeyedRecord[];
}

type SortDir = "asc" | "desc";
interface SortState {
  key: string;
  dir: SortDir;
}

export function DataTable({ table, records }: Props) {
  const [filter, setFilter] = useState<FilterState>({ search: "", selectFilters: {} });
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const searchableKeys = useMemo(
    () => table.fields.filter((f) => f.searchable).map((f) => f.key),
    [table]
  );

  // 过滤
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (!matchesSearch(r, filter.search, searchableKeys)) return false;
      for (const [key, val] of Object.entries(filter.selectFilters)) {
        if (!val) continue;
        const fieldVal = r[key];
        if (Array.isArray(fieldVal)) {
          if (!fieldVal.includes(val)) return false;
        } else {
          if (String(fieldVal) !== val) return false;
        }
      }
      return true;
    });
  }, [records, filter, searchableKeys]);

  // 排序
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const an = toNumber(av);
      const bn = toNumber(bv);
      if (an !== null && bn !== null) return (an - bn) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const activeFilters = Object.entries(filter.selectFilters).filter(([, v]) => v);

  function toggleSort(key: string) {
    if (sort?.key === key) {
      setSort(sort.dir === "asc" ? { key, dir: "desc" } : null);
    } else {
      setSort({ key, dir: "asc" });
    }
  }

  function clearOne(key: string) {
    setFilter((f) => {
      const { [key]: _, ...rest } = f.selectFilters;
      return { ...f, selectFilters: rest };
    });
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter */}
      <FilterBar
        fields={table.fields}
        records={records}
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setPage(0);
        }}
      />

      {/* 活跃过滤 chips */}
      {(filter.search.trim() || activeFilters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            ACTIVE
          </span>
          {filter.search.trim() && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-2.5 py-0.5 font-mono text-xs text-indigo-700">
              <span>SEARCH:&quot;{filter.search}&quot;</span>
              <button
                onClick={() => setFilter((f) => ({ ...f, search: "" }))}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-indigo-500 hover:bg-indigo-200/50 hover:text-indigo-800"
                aria-label="清空搜索"
              >
                <IconClose className="h-2.5 w-2.5 stroke-[2.5]" />
              </button>
            </span>
          )}
          {activeFilters.map(([k, v]) => {
            const label = table.fields.find((f) => f.key === k)?.label ?? k;
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 font-mono text-xs text-zinc-700"
              >
                <span>{label}: {v}</span>
                <button
                  onClick={() => clearOne(k)}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                  aria-label={`清空 ${label}`}
                >
                  <IconClose className="h-2.5 w-2.5 stroke-[2.5]" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* 计数 + 分页指示 */}
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 px-4 py-2 font-mono text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <IconSum className="h-3.5 w-3.5 stroke-[2] text-zinc-500" />
          <span className="font-bold text-zinc-900">{records.length}</span>
          <span className="text-zinc-400">TOTAL</span>
        </span>
        {filtered.length !== records.length && (
          <>
            <span className="text-zinc-300">│</span>
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-indigo-600">{filtered.length}</span>
              <span className="text-zinc-400">MATCHED</span>
            </span>
          </>
        )}
        {totalPages > 1 && (
          <>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="text-zinc-400">PAGE</span>
              <span className="font-bold text-zinc-800">
                {String(safePage + 1).padStart(2, "0")}/{String(totalPages).padStart(2, "0")}
              </span>
            </span>
          </>
        )}
      </div>

      {/* 表格 */}
      <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-2xl border border-zinc-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-100/90 backdrop-blur-xs text-xs font-semibold uppercase tracking-wider text-zinc-600">
            <tr>
              {table.fields.map((f, i) => {
                const isSorted = sort?.key === f.key;
                const canSort = f.sortable !== false;
                return (
                  <th
                    key={f.key}
                    className={`whitespace-nowrap border-r border-zinc-200/60 px-3.5 py-2.5 text-left font-semibold last:border-r-0 ${canSort ? "cursor-pointer hover:bg-zinc-200/60 transition-colors" : ""} ${f.width ?? ""}`}
                    onClick={() => canSort && toggleSort(f.key)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-zinc-400 font-normal">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-zinc-800">{f.label}</span>
                      {isSorted && (
                        <span className="text-indigo-600">
                          {sort?.dir === "asc" ? (
                            <IconArrowUp className="inline h-3 w-3 stroke-[2.5]" />
                          ) : (
                            <IconArrowDown className="inline h-3 w-3 stroke-[2.5]" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-mono text-xs">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={table.fields.length} className="p-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-zinc-400">
                    <IconEmpty className="h-10 w-10 stroke-[1.5]" />
                    <span className="font-mono text-xs uppercase tracking-wider">
                      NO MATCHING RECORDS
                    </span>
                    {filter.search.trim() && (
                      <button
                        onClick={() => setFilter({ search: "", selectFilters: {} })}
                        className="mt-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50"
                      >
                        CLEAR FILTERS
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((r, ri) => (
                <tr
                  key={r.__id}
                  className="transition-colors hover:bg-zinc-50/80"
                >
                  {table.fields.map((f) => {
                    const v = r[f.key];
                    return (
                      <td
                        key={f.key}
                        className={`whitespace-nowrap border-r border-zinc-100 px-3.5 py-2.5 align-middle last:border-r-0 ${f.width ?? ""}`}
                      >
                        {f.key === table.primaryKey ? (
                          <Link
                            href={`/table/${table.id}/${encodeURIComponent(String(v))}`}
                            className="font-semibold text-zinc-900 hover:text-indigo-600 hover:underline transition-colors"
                          >
                            {renderCell(f, v, r)}
                          </Link>
                        ) : (
                          renderCell(f, v, r)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-1.5 font-mono text-xs font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <IconArrowLeft className="h-3.5 w-3.5 stroke-[2]" />
            PREV
          </button>
          <span className="rounded-xl border border-zinc-200/80 bg-zinc-50 px-3.5 py-1.5 font-mono text-xs font-semibold text-zinc-700">
            {String(safePage + 1).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-1.5 font-mono text-xs font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            NEXT
            <IconArrowRight className="h-3.5 w-3.5 stroke-[2]" />
          </button>
        </div>
      )}
    </div>
  );
}

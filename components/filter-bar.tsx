// Swiss Style Filter Bar —— 严格矩形、无圆角、强边框

"use client";

import { useMemo } from "react";
import type { TableField } from "@/lib/tables";
import { inferOptions } from "@/lib/record-utils";
import type { KeyedRecord } from "@/lib/types";
import { IconSearch, IconClose } from "./icons";

export interface FilterState {
  search: string;
  selectFilters: Record<string, string>;
}

interface Props {
  fields: TableField[];
  records: KeyedRecord[];
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterBar({ fields, records, value, onChange }: Props) {
  const filterableFields = useMemo(
    () => fields.filter((f) => f.filterable),
    [fields]
  );

  const selectOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of filterableFields) {
      map[f.key] = inferOptions(records, f.key);
    }
    return map;
  }, [filterableFields, records]);

  const hasActive =
    value.search.trim() !== "" ||
    Object.values(value.selectFilters).some((v) => v && v !== "");

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
      {/* Section label */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 font-mono text-xs text-zinc-600">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white font-bold">F.01</span>
          <span className="font-semibold uppercase tracking-wider">FILTER & SEARCH</span>
        </div>
        {hasActive && (
          <button
            onClick={() => onChange({ search: "", selectFilters: {} })}
            className="font-mono text-xs font-semibold text-[#E03E1A] hover:underline"
          >
            清空筛选
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="flex items-center border-b border-zinc-100 px-3 py-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center text-zinc-400">
          <IconSearch className="h-4 w-4" />
        </span>
        <input
          type="text"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="搜索任意字段（名称 / 域名 / 备注 / Provider…）"
          className="flex-1 bg-transparent px-2 py-2.5 font-mono text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
        />
        {value.search && (
          <button
            onClick={() => onChange({ ...value, search: "" })}
            className="flex h-7 w-7 items-center justify-center text-zinc-400 hover:text-zinc-700"
            aria-label="清空"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Select filters */}
      {filterableFields.length > 0 && (
        <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 bg-zinc-50/30">
          {filterableFields.map((f) => {
            const opts = selectOptions[f.key] ?? [];
            const current = value.selectFilters[f.key] ?? "";
            return (
              <div key={f.key} className="flex min-w-[180px] flex-1 items-center px-3 py-2">
                <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mr-2">
                  {f.label}:
                </span>
                <select
                  value={current}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      selectFilters: { ...value.selectFilters, [f.key]: e.target.value },
                    })
                  }
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-700 outline-none shadow-2xs"
                >
                  <option value="">全部</option>
                  {opts.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

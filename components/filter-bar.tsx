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
    <div className="border-2 border-swiss-fg bg-swiss-bg">
      {/* Section label */}
      <div className="flex items-center gap-3 border-b-2 border-swiss-fg bg-swiss-fg px-4 py-2 font-mono text-sm uppercase tracking-ultra text-swiss-bg">
        <span className="bg-swiss-accent px-1.5 py-0.5 text-swiss-bg">F.01</span>
        <span>FILTER / SEARCH</span>
        {hasActive && (
          <button
            onClick={() => onChange({ search: "", selectFilters: {} })}
            className="ml-auto border border-swiss-bg bg-swiss-bg px-2 py-0.5 text-sm font-black uppercase tracking-widest text-swiss-fg transition-colors hover:bg-swiss-accent hover:text-swiss-bg"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="flex items-stretch border-b-2 border-swiss-fg">
        <span className="flex w-12 items-center justify-center border-r-2 border-swiss-fg bg-swiss-muted">
          <IconSearch className="h-5 w-5 stroke-[1.5] text-swiss-fg" />
        </span>
        <input
          type="text"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="搜索任意字段（名称 / 域名 / 备注 / provider…）"
          className="flex-1 bg-swiss-bg px-4 py-3 font-mono text-sm placeholder:text-swiss-fg/40 focus:bg-swiss-muted focus:outline-none"
        />
        {value.search && (
          <button
            onClick={() => onChange({ ...value, search: "" })}
            className="flex items-center border-l-2 border-swiss-fg bg-swiss-bg px-4 font-mono text-sm uppercase tracking-widest hover:bg-swiss-fg hover:text-swiss-bg"
            aria-label="清空"
          >
            <IconClose className="h-4 w-4 stroke-[2]" />
          </button>
        )}
      </div>

      {/* Select filters */}
      {filterableFields.length > 0 && (
        <div className="flex flex-wrap">
          {filterableFields.map((f) => {
            const opts = selectOptions[f.key] ?? [];
            const current = value.selectFilters[f.key] ?? "";
            return (
              <div key={f.key} className="flex min-w-[180px] flex-1 items-stretch border-r-2 border-swiss-fg last:border-r-0">
                <span className="flex w-10 items-center justify-center border-r border-swiss-fg bg-swiss-muted font-mono text-sm uppercase tracking-widest text-swiss-fg/60">
                  {f.label.slice(0, 3).toUpperCase()}
                </span>
                <select
                  value={current}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      selectFilters: { ...value.selectFilters, [f.key]: e.target.value },
                    })
                  }
                  className="flex-1 appearance-none bg-swiss-bg px-3 py-2.5 font-mono text-sm uppercase tracking-wider focus:bg-swiss-muted focus:outline-none"
                >
                  <option value="">全部 {f.label}</option>
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

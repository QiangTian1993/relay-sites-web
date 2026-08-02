// Notion-style Data View —— 主容器（Grid 视图唯一）
// 顶部：Filter Bar + Group tabs
// 下面：Grid 卡片内容（含 group sections）

"use client";

import { useMemo, useState } from "react";
import type { KeyedRecord } from "@/lib/types";
import type { TableConfig } from "@/lib/tables";
import { type GroupByOption, groupRecords } from "@/lib/grouping";
import { GridView } from "./views/grid-view";
import { FilterBar, type FilterState } from "./filter-bar";
import { matchesSearch } from "@/lib/record-utils";
import { parseRateForProvider } from "@/lib/matrix";

interface Props {
  table: TableConfig;
  records: KeyedRecord[];
}

export function NotionDataView({ table, records }: Props) {
  const [groupById, setGroupById] = useState<string>("none");
  const [filter, setFilter] = useState<FilterState>({ search: "", selectFilters: {} });

  // Group by options (基于 table fields 自动生成)
  const groupOptions = useMemo<GroupByOption[]>(() => {
    const opts: GroupByOption[] = [
      { id: "none", label: "ALL", fieldKey: "", fieldType: "text", enabled: true },
    ];
    for (const f of table.fields) {
      if (f.type === "single-select") {
        opts.push({
          id: `by:${f.key}`,
          label: `BY ${f.label.toUpperCase()}`,
          fieldKey: f.key,
          fieldType: "single-select",
          enabled: true,
        });
      } else if (f.type === "multi-select") {
        opts.push({
          id: `by:${f.key}`,
          label: `BY ${f.label.toUpperCase()}`,
          fieldKey: f.key,
          fieldType: "multi-select",
          enabled: true,
        });
      } else if (f.type === "date") {
        opts.push({
          id: `by:${f.key}`,
          label: `BY ${f.label.toUpperCase()}`,
          fieldKey: f.key,
          fieldType: "date",
          enabled: true,
        });
      } else if (f.type === "number" && f.key === "最低倍率") {
        // 数字字段只对"最低倍率"特殊处理（按区间分组）
        opts.push({
          id: `by:${f.key}`,
          label: `BY ${f.label.toUpperCase()}`,
          fieldKey: f.key,
          fieldType: "number",
          enabled: true,
        });
      }
    }
    return opts;
  }, [table]);

  // 先 filter
  const filteredRecords = useMemo(() => {
    const searchableKeys = table.fields.filter((f) => f.searchable).map((f) => f.key);
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
  }, [records, filter, table]);

  // 再 group
  const groupOption = groupOptions.find((o) => o.id === groupById) ?? groupOptions[0];
  const groups = useMemo(
    () => groupRecords(filteredRecords, groupOption),
    [filteredRecords, groupOption]
  );

  // 关键指标（HERO 数字）：表自动判断 —— 必须在 metaFields 之前定义
  const keyMetric = useMemo(() => {
    if (table.id === "relay_sites_tracker") {
      return {
        field: "最低倍率",
        label: "LOW",
        format: (v: number) => `${v}x`,
      };
    }
    if (table.id === "vibe_coding_tracker") {
      return {
        field: "评分",
        label: "RATING",
        format: (v: number) => String(v),
      };
    }
    return null;
  }, [table.id]);

  // meta fields 智能去重
  // 排除逻辑：
  //   1. primaryKey / titleField（已在标题显示）
  //   2. subtitleField（已在副标显示，避免重复）
  //   3. multi-select 字段（保留给 chips 独占显示）
  //   4. keyMetricField（已在 Swiss Red 数字显示）
  //   5. 只取前 4 个作为 sub-card 嵌套展示
  const metaFields = useMemo(() => {
    const skipKeys = new Set<string>([
      table.primaryKey,
      table.titleField,
      table.subtitleField ?? "",
      keyMetric?.field ?? "",
    ]);
    const fm = table.fields.filter(
      (f) => !skipKeys.has(f.key) && f.type !== "multi-select"
    );
    return fm.slice(0, 4).map((f) => ({ key: f.key, label: f.label }));
  }, [table, keyMetric]);

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Filter Bar ===== */}
      <FilterBar
        fields={table.fields}
        records={records}
        value={filter}
        onChange={setFilter}
      />

      {/* ===== Group tabs + Count ===== */}
      <div className="flex flex-wrap items-stretch border-2 border-swiss-fg bg-swiss-bg">
        {/* Group by tabs */}
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          <span className="flex items-center gap-2 border-r border-swiss-fg bg-swiss-muted px-3 font-mono text-sm uppercase tracking-ultra text-swiss-fg/60">
            GROUP
          </span>
          {groupOptions.map((opt) => {
            const active = groupById === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setGroupById(opt.id)}
                className={`inline-flex shrink-0 items-center border-r border-swiss-fg px-3 py-2.5 font-mono text-sm font-black uppercase tracking-widest transition-colors last:border-r-0 ${
                  active ? "bg-swiss-fg text-swiss-bg" : "bg-swiss-bg text-swiss-fg hover:bg-swiss-muted"
                }`}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Count */}
        <div className="flex items-center gap-2 border-l-2 border-swiss-fg bg-swiss-fg px-4 py-2.5 font-mono text-sm font-black uppercase tracking-widest text-swiss-bg">
          <span className="bg-swiss-bg px-1.5 py-0.5 text-swiss-fg">∑</span>
          {filteredRecords.length}
          {filteredRecords.length !== records.length && (
            <span className="font-normal text-swiss-bg/60">/ {records.length}</span>
          )}
        </div>
      </div>

      {/* ===== Grid View ===== */}
      <GridView
        groups={groups}
        basePath={`/table/${table.id}`}
        primaryField={table.titleField}
        secondaryField={table.subtitleField}
        keyMetricField={keyMetric?.field}
        keyMetricLabel={keyMetric?.label}
        keyMetricFormat={keyMetric?.format}
        metaFields={metaFields}
        // 动态 key metric：按 provider 分组时，显示该 provider 的倍率
        groupProvider={
          groupOption?.fieldType === "multi-select" ? groupOption.fieldKey : null
        }
        // filter 选中的 provider（用于 ALL 分组时仍按 filter 显示动态倍率）
        filterProvider={filter.selectFilters["支持的 provider"] as string | undefined}
        ratePerProvider={parseRateForProvider}
      />
    </div>
  );
}
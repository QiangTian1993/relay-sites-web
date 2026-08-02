// Grouping helper —— 按字段分组 + Notion 风格 group sections
// 复用：纯函数，客户端/服务端都能用

import type { KeyedRecord } from "./types";

export type GroupKey = string;
export interface Group {
  /** group 显示名（字段值） */
  label: string;
  /** group 内 records */
  records: KeyedRecord[];
  /** 排序用（数字 / 日期可排序） */
  sortKey: string | number;
}

/** group by 选项定义（每个表自定义） */
export interface GroupByOption {
  id: string;
  label: string;
  /** records 字段 key */
  fieldKey: string;
  /** 字段类型决定 group 逻辑 */
  fieldType: "single-select" | "multi-select" | "text" | "date" | "number";
  /** 是否启用（表 config 里有这个字段才 true） */
  enabled: boolean;
}

/** 取 records 的字段值（支持多种类型） */
function getFieldValue(r: KeyedRecord, key: string): unknown {
  return r[key];
}

/** 按 single-select / text 字段 group by */
function groupBySingle(records: KeyedRecord[], key: string): Group[] {
  const map = new Map<string, KeyedRecord[]>();
  for (const r of records) {
    const v = getFieldValue(r, key);
    const label = v == null || v === "" ? "未填" : String(v);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(r);
  }
  return [...map.entries()].map(([label, recs]) => ({
    label,
    records: recs,
    sortKey: label,
  }));
}

/** 按 multi-select 字段 group by（record 出现在多个 group） */
function groupByMulti(records: KeyedRecord[], key: string): Group[] {
  const map = new Map<string, KeyedRecord[]>();
  for (const r of records) {
    const v = getFieldValue(r, key);
    const arr = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    if (arr.length === 0) {
      if (!map.has("未填")) map.set("未填", []);
      map.get("未填")!.push(r);
      continue;
    }
    for (const val of arr) {
      if (!map.has(val)) map.set(val, []);
      map.get(val)!.push(r);
    }
  }
  return [...map.entries()].map(([label, recs]) => ({
    label,
    records: recs,
    sortKey: label,
  }));
}

/** 按 date 字段 group by（按 year-month） */
function groupByDate(records: KeyedRecord[], key: string): Group[] {
  const map = new Map<string, KeyedRecord[]>();
  for (const r of records) {
    const v = getFieldValue(r, key);
    let label = "未填";
    if (typeof v === "string" && v) {
      // 尝试解析日期
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        label = `${y}-${m}`;
      } else {
        label = v;
      }
    } else if (typeof v === "number") {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        label = `${y}-${m}`;
      }
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(r);
  }
  // 按时间倒序（最新在前）
  return [...map.entries()]
    .map(([label, recs]) => ({ label, records: recs, sortKey: label }))
    .sort((a, b) => {
      if (a.label === "未填") return 1;
      if (b.label === "未填") return -1;
      return String(b.sortKey).localeCompare(String(a.sortKey));
    });
}

/** 按 number 字段 group by（按区间） */
function groupByNumber(records: KeyedRecord[], key: string): Group[] {
  const map = new Map<string, KeyedRecord[]>();
  for (const r of records) {
    const v = getFieldValue(r, key);
    let label = "未填";
    if (typeof v === "number" && !Number.isNaN(v)) {
      if (v < 0.1) label = "< 0.1x (价格屠夫)";
      else if (v < 0.3) label = "0.1 - 0.3x";
      else if (v < 0.6) label = "0.3 - 0.6x";
      else if (v < 1) label = "0.6 - 1x";
      else label = "≥ 1x (溢价)";
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(r);
  }
  return [...map.entries()].map(([label, recs]) => ({ label, records: recs, sortKey: label }));
}

/** 主入口：按 option 执行 group by */
export function groupRecords(
  records: KeyedRecord[],
  option: GroupByOption | null
): Group[] {
  if (!option || option.id === "none") {
    return [
      {
        label: "ALL",
        records,
        sortKey: 0,
      },
    ];
  }

  let groups: Group[];
  switch (option.fieldType) {
    case "single-select":
    case "text":
      groups = groupBySingle(records, option.fieldKey);
      break;
    case "multi-select":
      groups = groupByMulti(records, option.fieldKey);
      break;
    case "date":
      groups = groupByDate(records, option.fieldKey);
      break;
    case "number":
      groups = groupByNumber(records, option.fieldKey);
      break;
    default:
      groups = groupBySingle(records, option.fieldKey);
  }

  // 按 sortKey 字母/数字排序（"未填" 排最后）
  return groups.sort((a, b) => {
    if (a.label === "未填") return 1;
    if (b.label === "未填") return -1;
    if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
      return a.sortKey - b.sortKey;
    }
    return String(a.sortKey).localeCompare(String(b.sortKey));
  });
}

/** 通用 group by 选项工厂（基于 records 自动推断可用字段） */
export function inferGroupByOptions(
  records: KeyedRecord[],
  _allFieldKeys: string[]
): GroupByOption[] {
  // 占位：实际 option 由调用方传入
  void records;
  return [];
}
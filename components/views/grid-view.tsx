// Grid View —— 与 List View 一致的组件化结构
// 唯一差异：grid 容器（3 列卡片）+ 卡片内有 Hero / Supporting 分层
// 共享 Tag / FieldRow / KeyMetric / RecordHeader / RecordIndex / renderSpecialField

"use client";

import Link from "next/link";
import type { KeyedRecord } from "@/lib/types";
import type { Group } from "@/lib/grouping";
import { IconCircleDot } from "../icons";
import { Tag } from "./tag";
import { FieldRow } from "./field-row";
import { KeyMetric } from "./key-metric";
import { RecordHeader, RecordIndex, type RecordStatus } from "./record-header";
import { renderSpecialField } from "@/lib/render-fields";

interface Props {
  groups: Group[];
  basePath: string;
  primaryField: string;
  secondaryField?: string;
  keyMetricField?: string;
  keyMetricLabel?: string;
  keyMetricFormat?: (v: number) => string;
  metaFields?: Array<{ key: string; label: string }>;
  /** 当前 group by 的 multi-select 字段（如 "支持的 provider"），用于动态 key metric */
  groupProvider?: string | null;
  /** filter 选中的 provider（如 filter.selectFilters["支持的 provider"] = "OpenAI"） */
  filterProvider?: string | undefined;
  /** 从 "OpenAI 0.07x | Claude 0.055x" 中提取特定 provider 倍率的函数 */
  ratePerProvider?: (value: unknown, provider: string) => string | null;
}

function recordStatus(r: KeyedRecord): RecordStatus {
  const last = r["最后检查"];
  if (!last) return "unknown";
  if (typeof last !== "string" && typeof last !== "number") return "unknown";
  const d = new Date(last as string);
  if (Number.isNaN(d.getTime())) return "unknown";
  const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return "ok";
  return "warn";
}

function renderProviderTags(r: KeyedRecord, key: string) {
  const arr = Array.isArray(r[key])
    ? (r[key] as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  if (arr.length === 0) return null;
  return (
    <div className="inline-flex flex-wrap gap-1.5">
      {arr.slice(0, 5).map((p) => (
        <Tag key={p} variant="filled-success">
          {p}
        </Tag>
      ))}
      {arr.length > 5 && <Tag variant="mono">+{arr.length - 5}</Tag>}
    </div>
  );
}

export function GridView({
  groups,
  basePath,
  primaryField,
  secondaryField,
  keyMetricField,
  keyMetricLabel,
  keyMetricFormat,
  metaFields = [],
  groupProvider = null,
  filterProvider,
  ratePerProvider,
}: Props) {
  return (
    <div className="flex flex-col gap-10 bg-swiss-muted p-5 sm:p-6">
      {groups.map((group, gi) => (
        <section key={group.label + gi} className="flex flex-col gap-3">
          {/* Group header —— 去掉编号 tag chip，只保留字段名文字 + count */}
          <header className="flex items-center gap-3 border-b-2 border-swiss-fg bg-swiss-muted swiss-dots px-3 py-2 group/header">
            <span className="text-lg font-black uppercase tracking-tight text-swiss-fg">
              {group.label}
            </span>
            <span className="ml-auto inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-swiss-fg/60">
              <IconCircleDot className="h-3 w-3 stroke-[2.5] text-swiss-success" />
              <span className="font-black text-swiss-fg">{group.records.length}</span>
              <span>{group.records.length === 1 ? "ITEM" : "ITEMS"}</span>
            </span>
          </header>

          {/* Card grid —— 卡片在灰底上浮出（保持 3 列，不强求 4 列） */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.records.map((r, ri) => {
              const title = String(r[primaryField] ?? r.__id ?? "未命名");
              const subtitle = secondaryField ? r[secondaryField] : undefined;
              const km = keyMetricField ? r[keyMetricField] : undefined;
              const kmDefault =
                typeof km === "number" && keyMetricFormat
                  ? keyMetricFormat(km)
                  : typeof km === "number"
                  ? String(km)
                  : null;
              // 动态 key metric：当 group by 是 provider 时显示该 provider 倍率
              // 当 filter 选中 provider 时（ALL 分组）也显示该 provider 倍率
              const kmDynamic =
                groupProvider && ratePerProvider
                  ? ratePerProvider(r["分组倍率"], group.label)
                  : filterProvider && ratePerProvider
                  ? ratePerProvider(r["分组倍率"], filterProvider)
                  : null;
              const kmDisplay = kmDynamic ?? kmDefault;
              const kmLabel = kmDynamic ? (group.label !== "ALL" ? group.label : filterProvider!) : keyMetricLabel;
              const status = recordStatus(r);
              return (
                <Link
                  key={r.__id}
                  href={`${basePath}/${encodeURIComponent(r.__id)}`}
                  className="group relative flex flex-col border-2 border-swiss-fg bg-swiss-bg transition-colors hover:bg-swiss-fg hover:text-swiss-bg"
                >
                  {/* HERO 区：编号 + 状态点 + 标题 + 副标（与 List 一致） */}
                  <div className="flex items-start justify-between gap-3 border-b-2 border-swiss-fg p-4">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <RecordIndex rank={ri + 1} status={status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <RecordHeader
                        rank={ri + 1}
                        status={status}
                        title={title}
                        subtitle={subtitle != null ? String(subtitle) : undefined}
                      />
                    </div>
                    <KeyMetric
                      icon="zap"
                      label={kmLabel}
                      value={kmDisplay ?? "—"}
                      unit={kmDisplay ? "RATE" : undefined}
                      empty={kmDisplay == null}
                    />
                  </div>

                  {/* SUPPORTING 区：字段行 + provider tags（与 List 一致） */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {/* 字段行（与 List 一致：所有字段 inline 布局） */}
                    {metaFields.length > 0 && (
                      <dl className="flex flex-col">
                        {metaFields.slice(0, 4).map((mf, mi) => {
                          const v = r[mf.key];
                          if (v == null || v === "") return null;
                          const special = renderSpecialField(mf.key, v);
                          const display = special ?? (Array.isArray(v)
                            ? v
                                .filter((x): x is string => typeof x === "string")
                                .join(" · ")
                            : String(v));
                          return (
                            <FieldRow
                              key={mf.key}
                              label={mf.label}
                              value={display}
                              first={mi === 0}
                            />
                          );
                        })}
                      </dl>
                    )}

                    {/* Provider tags（与 List 一致） */}
                    <div className="flex">{renderProviderTags(r, "支持的 provider")}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <div className="border-2 border-swiss-fg bg-swiss-bg p-16 text-center font-mono text-sm uppercase tracking-ultra text-swiss-fg/40">
          ∅ NO RECORDS
        </div>
      )}
    </div>
  );
}
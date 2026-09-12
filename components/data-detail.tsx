// Swiss Style Data Detail —— 严格矩形、Swiss Red accent、显示结构

import Link from "next/link";
import type { TableConfig } from "@/lib/tables";
import type { KeyedRecord } from "@/lib/types";
import { renderCell } from "./cell-renderer";
import { IconArrowLeft, IconPlus } from "./icons";

interface Props {
  table: TableConfig;
  record: KeyedRecord;
}

export function DataDetail({ table, record }: Props) {
  const primary = table.fields.filter((f) => f.primary);
  const secondary = table.fields.filter((f) => !f.primary);

  const title = String(record[table.titleField] ?? "未命名");
  const subtitleVal = table.subtitleField ? record[table.subtitleField] : undefined;

  return (
    <div className="flex flex-col pb-20">
      {/* ===== HERO HEADER ===== */}
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
        <div className="border-b border-zinc-100 bg-zinc-50/50">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 font-mono text-xs text-zinc-500 sm:px-6">
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white font-bold">D.01</span>
            <span>{table.id.toUpperCase()} / DETAIL</span>
            <Link
              href={`/table/${table.id}`}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
            >
              <IconArrowLeft className="h-3 w-3" />
              返回列表
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
              PRIMARY INFO
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 break-words sm:text-5xl">
              {title}
            </h1>
            {subtitleVal != null && (
              <div className="mt-3 font-mono text-xs text-zinc-500 break-all">
                {renderCell(
                  { ...table.fields.find((f) => f.key === table.subtitleField)!, key: "_subtitle" } as never,
                  subtitleVal,
                  record
                )}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
              METADATA
            </div>
            <dl className="grid grid-cols-2 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-x divide-y divide-zinc-100">
              <div className="p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">RECORD ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs font-medium text-zinc-800">{record.__id}</dd>
              </div>
              <div className="p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">TABLE</dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold uppercase text-zinc-800">{table.id}</dd>
              </div>
              <div className="p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">FIELDS</dt>
                <dd className="mt-0.5 font-mono text-xs font-bold text-zinc-800">{table.fields.length}</dd>
              </div>
              <div className="p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">VERSION</dt>
                <dd className="mt-0.5 font-mono text-xs text-zinc-500">0.1.0</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      {/* ===== PRIMARY FIELDS ===== */}
      {primary.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
          <div className="mb-3.5 flex items-center gap-2">
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">D.02</span>
            <h2 className="text-base font-bold text-zinc-900">主要字段</h2>
            <span className="ml-auto font-mono text-xs text-zinc-400">{primary.length} 项</span>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
            <dl className="divide-y divide-zinc-100">
              {primary.map((f, i) => {
                const v = record[f.key];
                return (
                  <div
                    key={f.key}
                    className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-6 hover:bg-zinc-50/50 transition-colors"
                  >
                    <dt className="flex items-baseline gap-2 font-mono text-xs text-zinc-400">
                      <span className="text-[11px] font-semibold text-zinc-300">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-semibold text-zinc-700">{f.label}</span>
                    </dt>
                    <dd className="font-mono text-xs text-zinc-900 break-words">
                      {renderCell(f, v, record)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>
      )}

      {/* ===== SECONDARY FIELDS ===== */}
      {secondary.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-4 pt-2 sm:px-6">
          <details className="group rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5 font-mono text-xs font-semibold text-zinc-700 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-700 font-bold">D.03</span>
                <span>其他字段 ({secondary.length})</span>
              </div>
              <span className="text-zinc-400 transition-transform group-open:rotate-45">
                <IconPlus className="h-3.5 w-3.5" />
              </span>
            </summary>
            <dl className="divide-y divide-zinc-100">
              {secondary.map((f, i) => {
                const v = record[f.key];
                return (
                  <div
                    key={f.key}
                    className="grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-[200px_1fr] sm:gap-6 hover:bg-zinc-50/50 transition-colors"
                  >
                    <dt className="flex items-baseline gap-2 font-mono text-xs text-zinc-400">
                      <span className="text-[11px] font-semibold text-zinc-300">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-semibold text-zinc-600">{f.label}</span>
                    </dt>
                    <dd className="font-mono text-xs text-zinc-800 break-words">
                      {renderCell(f, v, record)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </details>
        </section>
      )}
    </div>
  );
}

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
    <div className="flex flex-col">
      {/* ===== HERO HEADER: 大标题 + 编号 ===== */}
      <header className="relative border-b-2 border-swiss-fg swiss-grid overflow-hidden">
        <div className="border-b border-swiss-fg/20 bg-swiss-fg text-swiss-bg">
          <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-3 font-mono text-sm uppercase tracking-ultra">
            <span className="bg-swiss-accent px-2 py-0.5 text-swiss-bg">D.01</span>
            <span>{table.id.toUpperCase()} / DETAIL</span>
            <Link
              href={`/table/${table.id}`}
              className="ml-auto inline-flex items-center gap-1.5 border border-swiss-bg bg-swiss-bg px-2 py-0.5 text-sm font-black text-swiss-fg hover:bg-swiss-accent"
            >
              <IconArrowLeft className="h-3 w-3 stroke-[2]" />
              BACK TO LIST
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-0 px-6 py-12 lg:grid-cols-[2fr_1fr]">
          <div className="border-b-2 border-swiss-fg pb-8 lg:border-b-0 lg:border-r-2 lg:pr-12 lg:pb-0">
            <div className="mb-3 flex items-center gap-3 font-mono text-sm uppercase tracking-ultra text-swiss-fg/60">
              <span>D.01.A / PRIMARY</span>
            </div>
            <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-black leading-[0.9] tracking-tightest break-words">
              {title}
            </h1>
            {subtitleVal != null && (
              <div className="mt-4 font-mono text-sm text-swiss-fg/70 break-all">
                {renderCell(
                  { ...table.fields.find((f) => f.key === table.subtitleField)!, key: "_subtitle" } as never,
                  subtitleVal,
                  record
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-0 pt-8 lg:pt-0 lg:pl-12">
            <div className="mb-3 font-mono text-sm uppercase tracking-ultra text-swiss-fg/60">
              D.01.B / METADATA
            </div>
            <dl className="grid grid-cols-2 gap-0 border-2 border-swiss-fg">
              <div className="border-b-2 border-r-2 border-swiss-fg/0 p-3 odd:border-r-2 even:border-r-0">
                <dt className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">RECORD ID</dt>
                <dd className="mt-1 break-all font-mono text-sm">{record.__id}</dd>
              </div>
              <div className="border-b-2 border-l-0 p-3">
                <dt className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">TABLE</dt>
                <dd className="mt-1 font-mono text-sm uppercase">{table.id}</dd>
              </div>
              <div className="border-r-2 p-3">
                <dt className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">FIELDS</dt>
                <dd className="mt-1 font-mono text-sm">{table.fields.length}</dd>
              </div>
              <div className="p-3">
                <dt className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">VERSION</dt>
                <dd className="mt-1 font-mono text-sm">0.1.0</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      {/* ===== PRIMARY FIELDS ===== */}
      {primary.length > 0 && (
        <section className="border-b-2 border-swiss-fg">
          <div className="border-b border-swiss-fg/20 bg-swiss-muted swiss-dots">
            <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-3 font-mono text-sm uppercase tracking-ultra text-swiss-fg">
              <span className="bg-swiss-accent px-2 py-0.5 text-swiss-bg">D.02</span>
              <span>PRIMARY FIELDS</span>
              <span className="ml-auto">{primary.length} KEYS</span>
            </div>
          </div>
          <div className="mx-auto max-w-[1600px] px-6 py-8">
            <dl className="border-2 border-swiss-fg divide-y-2 divide-swiss-fg/20">
              {primary.map((f, i) => {
                const v = record[f.key];
                return (
                  <div
                    key={f.key}
                    className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-[200px_1fr] sm:gap-8"
                  >
                    <dt className="flex items-baseline gap-3 font-mono text-sm uppercase tracking-widest text-swiss-fg/60">
                      <span className="font-mono text-sm text-swiss-fg/30">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-black text-swiss-fg">{f.label}</span>
                    </dt>
                    <dd className="font-mono text-sm text-swiss-fg break-words">
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
        <section className="border-b-2 border-swiss-fg">
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center gap-4 border-b border-swiss-fg/20 bg-swiss-muted swiss-diagonal px-6 py-3 font-mono text-sm uppercase tracking-ultra text-swiss-fg [&::-webkit-details-marker]:hidden">
              <span className="bg-swiss-fg px-2 py-0.5 text-swiss-bg">D.03</span>
              <span>SECONDARY FIELDS</span>
              <span className="ml-auto">{secondary.length} KEYS</span>
              <span className="inline-block transition-transform group-open:rotate-45">
                <IconPlus className="h-4 w-4 stroke-[2]" />
              </span>
            </summary>
            <div className="mx-auto max-w-[1600px] px-6 py-8">
              <dl className="border-2 border-swiss-fg/40 divide-y-2 divide-swiss-fg/20">
                {secondary.map((f, i) => {
                  const v = record[f.key];
                  return (
                    <div
                      key={f.key}
                      className="grid grid-cols-1 gap-2 px-6 py-3 sm:grid-cols-[200px_1fr] sm:gap-8"
                    >
                      <dt className="flex items-baseline gap-3 font-mono text-sm uppercase tracking-widest text-swiss-fg/60">
                        <span className="text-sm text-swiss-fg/30">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-black text-swiss-fg">{f.label}</span>
                      </dt>
                      <dd className="font-mono text-sm text-swiss-fg break-words">
                        {renderCell(f, v, record)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, ShieldCheck, Sparkles, Tag, Zap } from "lucide-react";

/**
 * 艺术级杂货铺专属印章 (Artisanal Rubber Stamp Seal)
 * 采用双层同心边框/虚实线结合、微倾斜角度与手工印泥质感
 */
export function RubberStamp({
  text,
  subtext,
  variant = "red",
  rotate = -3,
  size = "md",
  className = "",
}: {
  text: string;
  subtext?: string;
  variant?: "red" | "dark" | "green" | "amber";
  rotate?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const colorStyles = {
    red: "border-[#E03E1A] text-[#E03E1A] bg-[#E03E1A]/[0.03] shadow-[#E03E1A]/10",
    dark: "border-zinc-800 text-zinc-900 bg-zinc-900/[0.03] shadow-zinc-900/10",
    green: "border-emerald-700 text-emerald-800 bg-emerald-700/[0.03] shadow-emerald-700/10",
    amber: "border-amber-700 text-amber-800 bg-amber-700/[0.03] shadow-amber-700/10",
  }[variant];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[9.5px]",
    md: "px-2.5 py-1 text-[11px]",
    lg: "px-3.5 py-1.5 text-xs",
  }[size];

  return (
    <div
      style={{ transform: `rotate(${rotate}deg)` }}
      className={`inline-flex flex-col items-center justify-center rounded-lg border-2 border-double select-none transition-transform duration-200 hover:scale-105 shadow-2xs font-mono uppercase tracking-wider ${colorStyles} ${sizeStyles} ${className}`}
    >
      <div className="flex items-center gap-1 font-black leading-tight tracking-widest">
        <span>✦</span>
        <span>{text}</span>
        <span>✦</span>
      </div>
      {subtext && (
        <span className="text-[7.5px] font-bold tracking-[0.2em] opacity-80 mt-0.5 leading-none">
          {subtext}
        </span>
      )}
    </div>
  );
}

/**
 * 真实质感矢量条形码 (Realistic Vector Barcode)
 */
export function BarcodeGraphic({
  code = "8848-XIUXAI-2026",
  height = 34,
  showText = true,
  className = "",
}: {
  code?: string;
  height?: number;
  showText?: boolean;
  className?: string;
}) {
  const barPattern = [
    2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 3, 1, 2, 4, 1, 1, 2, 1,
    3, 2, 1, 2, 1, 1, 4, 2, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 1, 2, 3,
    1, 2, 2, 1, 3, 1, 2, 1, 1, 4, 1, 1, 2, 1
  ];

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        height={height}
        viewBox="0 0 180 34"
        className="w-full max-w-[200px]"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g fill="currentColor" opacity="0.85">
          {barPattern.map((width, idx) => {
            const x = barPattern
              .slice(0, idx)
              .reduce((sum, w) => sum + w * 2.6, 6);
            if (x > 172) return null;
            return (
              <rect
                key={idx}
                x={x}
                y={0}
                width={width * 1.3}
                height={34}
                opacity={idx % 2 === 0 ? 0.95 : 0}
              />
            );
          })}
        </g>
      </svg>
      {showText && (
        <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-zinc-400 mt-1 font-bold">
          *{code}*
        </span>
      )}
    </div>
  );
}

/**
 * 物理热敏小票齿孔撕纸边缘 (Perforated Receipt Sawtooth)
 */
export function ReceiptZigzag({
  height = 9,
  fill = "#FAF6ED",
  className = "",
}: {
  height?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <div className={`w-full overflow-hidden leading-none ${className}`} style={{ height }}>
      <svg
        className="w-full block"
        style={{ height }}
        viewBox="0 0 400 10"
        preserveAspectRatio="none"
      >
        <path
          d="M 0,0 
             L 10,10 L 20,0 L 30,10 L 40,0 L 50,10 L 60,0 L 70,10 L 80,0 L 90,10 L 100,0 
             L 110,10 L 120,0 L 130,10 L 140,0 L 150,10 L 160,0 L 170,10 L 180,0 L 190,10 L 200,0 
             L 210,10 L 220,0 L 230,10 L 240,0 L 250,10 L 260,0 L 270,10 L 280,0 L 290,10 L 300,0 
             L 310,10 L 320,0 L 330,10 L 340,0 L 350,10 L 360,0 L 370,10 L 380,0 L 390,10 L 400,0 
             Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

/**
 * 精美精品货品吊牌卡片 (Artisanal Shelf Hangtag)
 * 带有金属鸡眼打孔质感、精致 SKU 标号、大号等宽数字与检验徽记
 */
export function ShelfHangtag({
  sku,
  label,
  value,
  note,
  accent = false,
  isText = false,
}: {
  sku?: string;
  label: string;
  value: string | number;
  note?: string;
  accent?: boolean;
  isText?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent
          ? "border-orange-200/90 bg-gradient-to-b from-orange-50/70 via-white to-white shadow-xs"
          : "border-zinc-200/80 bg-gradient-to-b from-zinc-50/60 via-white to-white shadow-xs"
      }`}
    >
      {/* 金属打孔吊绳圈 (Brass Grommet Tag Hole) */}
      <div className="absolute top-3.5 right-3.5 flex items-center justify-center">
        <div className="h-3 w-3 rounded-full border border-zinc-300 bg-[#FAF9F5] shadow-inner flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-200/90 shadow-2xs" />
        </div>
      </div>

      <div>
        {sku && (
          <div className="inline-flex items-center gap-1 rounded bg-zinc-100/90 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
            <span>SKU</span>
            <span>·</span>
            <span>{sku}</span>
          </div>
        )}
        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 flex items-center gap-1.5">
          <Tag className="h-3 w-3 opacity-60" />
          <span>{label}</span>
        </div>
      </div>

      <div className="my-1.5">
        <div
          className={`font-mono font-black tabular-nums tracking-tight ${
            isText ? "text-base sm:text-lg" : "text-2xl sm:text-3xl"
          } ${accent ? "text-[#E03E1A]" : "text-zinc-950"}`}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {note && (
          <div className="text-[10.5px] text-zinc-500 mt-1 truncate font-medium">
            {note}
          </div>
        )}
      </div>

      {/* 吊牌底部细致防伪微标 */}
      <div className="mt-3 pt-2.5 border-t border-dashed border-zinc-200 flex justify-between items-center text-[8px] font-mono text-zinc-400 uppercase tracking-widest font-semibold">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
          <span>INSPECTED</span>
        </span>
        <span>VERIFIED ✓</span>
      </div>
    </div>
  );
}

/**
 * 货架门票式存根直达按钮 (Artisanal Shelf Ticket Stub)
 * 带有左右经典凹槽缺口、虚线撕裂线、票据编码与指示箭头
 */
export function ShelfTicketButton({
  href,
  label,
  sublabel,
  skuCode = "TICKET #01-A",
  primary = true,
}: {
  href: string;
  label: string;
  sublabel?: string;
  skuCode?: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md overflow-hidden ${
        primary
          ? "bg-zinc-950 border-zinc-900 text-white hover:bg-[#E03E1A] hover:border-[#E03E1A]"
          : "bg-white border-zinc-200/90 text-zinc-900 hover:border-zinc-300"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-sm sm:text-base font-extrabold tracking-wide">
            {label}
          </span>
          <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ArrowRight className="h-4 w-4 shrink-0 text-white" />
          </div>
        </div>
        {sublabel && (
          <div className="font-mono text-[11px] opacity-75 leading-relaxed">
            {sublabel}
          </div>
        )}
      </div>

      {/* 左右票据缺口凹槽 (Ticket Notches) + 虚线撕裂线 */}
      <div className="relative mt-5 pt-3 border-t border-dashed border-white/20 flex justify-between items-center text-[9px] font-mono opacity-65 uppercase tracking-widest font-bold">
        {/* Left Notch */}
        <div className="absolute -left-7 top-0 -translate-y-1/2 h-4 w-4 rounded-full bg-[#FAF9F5] border border-zinc-200/60 shadow-inner" />
        {/* Right Notch */}
        <div className="absolute -right-7 top-0 -translate-y-1/2 h-4 w-4 rounded-full bg-[#FAF9F5] border border-zinc-200/60 shadow-inner" />

        <span>{skuCode}</span>
        <span>FAST ENTRY →</span>
      </div>
    </Link>
  );
}

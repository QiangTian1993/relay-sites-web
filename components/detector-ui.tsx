"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Play, CheckCircle2, AlertTriangle, XCircle, Terminal, Activity, Key, Globe, Layers, Search, X, ChevronDown, RotateCw, Copy, Check } from "lucide-react";
import type { QCRecord, QCArchiveRow } from "@/lib/qc-store";

interface SiteOption {
  siteId: string;
  name: string;
  domain: string;
}

interface DetectorUIProps {
  initialQCRecords: QCArchiveRow[];
  sitesList: SiteOption[];
}

export default function DetectorUI({ initialQCRecords, sitesList }: DetectorUIProps) {
  const searchParams = useSearchParams();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [declaredModel, setDeclaredModel] = useState("gpt-5.6-sol");
  const [testedModel, setTestedModel] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const [isSiteOpen, setIsSiteOpen] = useState(false);
  const siteDropdownRef = useRef<HTMLDivElement>(null);
  const terminalLogsRef = useRef<HTMLDivElement>(null);
  const reportSectionRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<"quick" | "standard" | "full">("standard");

  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<QCRecord | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [qcHistory, setQcHistory] = useState<QCArchiveRow[]>(initialQCRecords);

  // URL Query 参数自动回填 (?site=cctq 或 ?siteId=cctq 或 ?url=...&model=...)
  useEffect(() => {
    if (!searchParams) return;
    const siteParam = searchParams.get("site") || searchParams.get("siteId");
    const urlParam = searchParams.get("url");
    const modelParam = searchParams.get("model");
    if (siteParam) {
      const q = siteParam.toLowerCase();
      const matched = sitesList.find(
        (s) => s.siteId.toLowerCase() === q || s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)
      );
      if (matched) {
        setSelectedSiteId(matched.siteId);
        const formatted = matched.domain.startsWith("http") ? matched.domain : `https://${matched.domain}`;
        setBaseUrl(`${formatted}/v1`);
      }
    } else if (urlParam) {
      setBaseUrl(urlParam.startsWith("http") ? urlParam : `https://${urlParam}`);
    }
    if (modelParam) {
      setDeclaredModel(modelParam);
    }
  }, [searchParams, sitesList]);

  // 终端内部日志容器平滑滚动到底部 (不影响外部浏览器窗口滚动)
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [liveLogs]);

  const filteredSites = useMemo(() => {
    const q = siteSearch.trim().toLowerCase();
    if (!q) return sitesList;
    return sitesList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.siteId.toLowerCase().includes(q)
    );
  }, [sitesList, siteSearch]);

  const selectedSite = sitesList.find((s) => s.siteId === selectedSiteId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target as Node)) {
        setIsSiteOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 当在下拉框中选择已知中转站点时，自动填入域名 API 地址
  const handleSiteSelect = (id: string) => {
    setSelectedSiteId(id);
    const matched = sitesList.find((s) => s.siteId === id);
    if (matched && matched.domain) {
      const formatted = matched.domain.startsWith("http") ? matched.domain : `https://${matched.domain}`;
      setBaseUrl(`${formatted}/v1`);
    }
  };

  const runDetection = async () => {
    if (!baseUrl || !apiKey) {
      alert("请填写 API Base URL 与 API Key");
      return;
    }

    setIsRunning(true);
    setCurrentResult(null);
    setErrorMsg(null);
    setLiveLogs([`${new Date().toLocaleTimeString()} 正在建立质检探针连接...`]);

    // 触发质检后平滑滚动到报告区域上方（留出 80px 顶部间隙，视角开阔自然）
    setTimeout(() => {
      if (reportSectionRef.current) {
        const top = reportSectionRef.current.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    }, 150);

    const targetSite = sitesList.find((s) => s.siteId === selectedSiteId);
    const abortController = new AbortController();
    // full 档 15 发探针最坏情况约 40s，留足裕量；超时自动中止避免无限等待
    const timeoutId = setTimeout(() => abortController.abort(), 120000);

    const appendLog = (line: string) => setLiveLogs((prev) => [...prev.slice(-199), line]);

    // 子路径部署（如 /relay-index）下 API 挂在 basePath 后，须用构建期注入的前缀拼接
    const apiBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    try {
      const res = await fetch(`${apiBase}/api/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          declaredModel,
          testedModel: testedModel || declaredModel,
          siteId: selectedSiteId || undefined,
          siteName: targetSite?.name || undefined,
          domain: targetSite?.domain || baseUrl.replace(/^https?:\/\//, "").split("/")[0],
          preset,
        }),
        signal: abortController.signal,
      });

      // 建流前的校验/限流错误返回普通 JSON
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || contentType.includes("application/json")) {
        const data = await res.json();
        setErrorMsg(data.error || "连接超时或端点未响应");
        if (Array.isArray(data.logs)) {
          setLiveLogs(data.logs);
        } else {
          appendLog(`❌ 检测失败: ${data.error}`);
        }
        setCurrentResult(null);
        return;
      }

      // NDJSON 流式消费：日志逐行实时上屏，最后收 result/error 事件
      const reader = res.body?.getReader();
      if (!reader) throw new Error("浏览器不支持流式响应");
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.type === "log" && typeof ev.line === "string") {
              appendLog(ev.line);
            } else if (ev.type === "result" && ev.record) {
              const record = ev.record as QCRecord;
              setCurrentResult(record);
              setErrorMsg(null);
              if (selectedSiteId) {
                setQcHistory((prev) => [
                  record,
                  ...prev.filter((r) => r.siteId !== record.siteId),
                ]);
              }
            } else if (ev.type === "error") {
              streamError = typeof ev.error === "string" ? ev.error : "检测异常";
            }
          } catch {
            // 忽略无法解析的残行
          }
        }
      }

      if (streamError) {
        setErrorMsg(streamError);
        setCurrentResult(null);
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      const msg = aborted
        ? "检测超时（120 秒已中止），目标端点可能无响应，建议改用极速档重试"
        : err instanceof Error ? err.message : String(err);
      setErrorMsg(`网络连通失败: ${msg}`);
      appendLog(`❌ ${msg}`);
      setCurrentResult(null);
    } finally {
      clearTimeout(timeoutId);
      setIsRunning(false);
    }
  };

  const handleCopyReport = () => {
    if (!currentResult) return;
    const text = [
      `### 🛡️ GPT-5.6 站点真实性在线质检凭证`,
      `- **测试站点**: ${currentResult.siteName} (\`${currentResult.domain || baseUrl}\`)`,
      `- **声明型号**: \`${currentResult.declaredModel}\` (请求: \`${currentResult.testedModel}\`)`,
      `- **综合加权评分**: **${currentResult.score} / 100 分** (${currentResult.verdictText})`,
      `- **实测统计详情**: 本次单轮 ${currentResult.currentScore ?? currentResult.score}分 · 累计 ${currentResult.historicalRounds || 1} 轮综合加权 (${currentResult.totalSamples || currentResult.sampleCount} 条探针) · 历史通过率 ${currentResult.passRate ?? 100}%`,
      `- **固有行为匹配**: Sol ${currentResult.probabilities.sol}% | Terra ${currentResult.probabilities.terra}% | Luna ${currentResult.probabilities.luna}%${currentResult.probabilitiesEstimated ? " (基线预估，非实测)" : ""}`,
      `- **证据置信**: ${currentResult.confidence === "high" ? "高" : currentResult.confidence === "medium" ? "中" : "低"}`,
      `- **Juice 结构指纹**: ${currentResult.juiceVerdict}`,
      `- **输出完整性**: ${currentResult.tamperDetected ? "🚨 发现强行改写篡改" : "✅ 正常 (未发现 32/48 改写)"}`,
      `- **Prompt 生效**: ${currentResult.promptOverrideDetected ? "⚠️ 提示词可能被中转覆盖" : "✅ 正常传递"}`,
      `- **质检时间**: ${new Date(currentResult.testedAt).toLocaleString("zh-CN")}`,
      `*(来源: Relay Sites Observatory 模型真实性质检中心)*`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── 01. Form Area ─────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#E03E1A] px-3 py-1 font-mono text-xs font-bold text-white uppercase tracking-wider">
              ONLINE PROBE
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
              发起在线模型真实性与混用质检
            </h2>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            探针指纹引擎: GPT-5.6 / Juice v4.1 (无须可信端)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Searchable Site Combobox */}
          <div className="relative" ref={siteDropdownRef}>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center justify-between">
              <span>关联中转大盘站点 ({sitesList.length} 站可搜索)</span>
              <Search className="h-3.5 w-3.5 text-zinc-400" />
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder="输入站点名称 / 域名 / ID 搜索 (如 walkai)..."
                value={isSiteOpen ? siteSearch : selectedSite ? `${selectedSite.name} (${selectedSite.domain})` : siteSearch}
                onFocus={() => {
                  setIsSiteOpen(true);
                  setSiteSearch("");
                }}
                onChange={(e) => {
                  setSiteSearch(e.target.value);
                  if (!isSiteOpen) setIsSiteOpen(true);
                }}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 pr-16 font-mono text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 shadow-2xs transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {selectedSiteId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSiteId("");
                      setSiteSearch("");
                      setBaseUrl("");
                    }}
                    className="p-1 rounded hover:bg-zinc-200 font-mono text-xs text-zinc-400 hover:text-zinc-700"
                    title="清除选择"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSiteOpen(!isSiteOpen)}
                  className="p-1 rounded hover:bg-zinc-200"
                >
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {isSiteOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-2xl border border-zinc-200 bg-white shadow-lg max-h-64 overflow-y-auto p-1.5">
                <div className="p-2 rounded-lg bg-zinc-50 font-mono text-[10.5px] font-bold text-zinc-500 flex items-center justify-between mb-1">
                  <span>匹配结果 ({filteredSites.length} / {sitesList.length})</span>
                  {selectedSiteId && <span className="text-zinc-800">已选: {selectedSite?.name}</span>}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSiteId("");
                    setIsSiteOpen(false);
                    setSiteSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-mono text-xs font-bold transition-colors ${
                    !selectedSiteId ? "bg-zinc-100 text-zinc-900 font-bold" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  -- 手动自填 API 地址 --
                </button>

                {filteredSites.length === 0 ? (
                  <div className="p-4 font-mono text-xs text-center text-zinc-400">
                    未找到包含 "{siteSearch}" 的站点
                  </div>
                ) : (
                  filteredSites.map((site) => (
                    <button
                      key={site.siteId}
                      type="button"
                      onClick={() => {
                        handleSiteSelect(site.siteId);
                        setIsSiteOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-mono text-xs transition-colors flex items-center justify-between group ${
                        selectedSiteId === site.siteId
                          ? "bg-orange-50 text-[#E03E1A] font-bold"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold">{site.name}</span>
                        <span className="ml-2 text-zinc-400 text-[11px]">{site.domain}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400 shrink-0 ml-2">
                        {site.siteId}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <p className="mt-1.5 font-mono text-[10px] text-zinc-400">
              支持拼音/英文域名模糊搜索 165+ 站点，选择后自动填入 URL
            </p>
          </div>

          {/* API Base URL */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center justify-between">
              <span>API Base URL *</span>
              <Globe className="h-3.5 w-3.5 text-zinc-400" />
            </label>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 font-mono text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 shadow-2xs transition-all"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center justify-between">
              <span>API Key * (绝不持久化落盘)</span>
              <Key className="h-3.5 w-3.5 text-zinc-400" />
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 pr-16 font-mono text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 shadow-2xs transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md font-mono text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase border border-zinc-200 px-2 py-0.5 bg-white shadow-2xs"
              >
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>
          </div>

          {/* Standard Model */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
              申报标准模型 (Standard Model)
            </label>
            <select
              value={declaredModel}
              onChange={(e) => setDeclaredModel(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 font-mono text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 shadow-2xs transition-all"
            >
              <option value="gpt-5.6-sol">gpt-5.6-sol (Sol 旗舰模型)</option>
              <option value="gpt-5.6-terra">gpt-5.6-terra (Terra 平衡模型)</option>
              <option value="gpt-5.6-luna">gpt-5.6-luna (Luna 快速模型)</option>
              <option value="gpt-4o">gpt-4o (OpenAI 旗舰)</option>
              <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (Claude 旗舰)</option>
            </select>
          </div>

          {/* Tested Model / Alias */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
              实际请求模型别名 (可选)
            </label>
            <input
              type="text"
              placeholder="留空同申报模型 (如 custom-sol)"
              value={testedModel}
              onChange={(e) => setTestedModel(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 font-mono text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 shadow-2xs transition-all"
            />
          </div>

          {/* Test Preset */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
              探针测试档位 (Probe Preset)
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {(["quick", "standard", "full"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`rounded-xl border py-2 font-bold uppercase transition-all ${
                    preset === p
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-xs"
                      : "bg-zinc-50/80 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {p === "quick" ? "极速" : p === "standard" ? "常规" : "高档"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-4">
          <p className="font-mono text-xs text-zinc-400">
            🔒 提示: API Key 仅用于本次内存单次探针推流，严格 net-guard 物理防护，绝不落盘。
          </p>
          <button
            type="button"
            disabled={isRunning}
            onClick={runDetection}
            className={`flex items-center gap-2 rounded-xl px-7 py-2.5 font-mono text-sm font-bold uppercase tracking-wider transition-all shadow-xs ${
              isRunning
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-[#E03E1A] hover:shadow-sm"
            }`}
          >
            {isRunning ? (
              <>
                <Activity className="h-4 w-4 animate-spin" /> 探针检测中...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" /> 开始真实性与混用质检
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── 02. Live Report Card & Logs ───────────────────────────────── */}
      {(isRunning || currentResult || liveLogs.length > 0) && (
        <section ref={reportSectionRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-20">
          {/* Left: Inspection Verdict Report (2 columns) */}
          <div className="lg:col-span-2 rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#E03E1A]" />
                <h3 className="text-lg font-bold tracking-tight text-zinc-950">
                  质检评估报告 · Inspection Verdict
                </h3>
              </div>
              {currentResult && (
                <span className="font-mono text-xs text-zinc-400">
                  测试时间: {new Date(currentResult.testedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {currentResult ? (
              <div className="space-y-6">
                {/* Score & Verdict Banner */}
                <div
                  className={`rounded-2xl border p-5 sm:p-6 transition-all ${
                    currentResult.verdict === "PASS"
                      ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-950"
                      : currentResult.verdict === "WARNING"
                      ? "bg-amber-50/70 border-amber-200/80 text-amber-950"
                      : "bg-rose-50/70 border-rose-200/80 text-rose-950"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <div className="font-mono text-4xl sm:text-5xl font-black text-zinc-950 flex items-baseline gap-1.5">
                        <span>{currentResult.score}</span>
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">/ 100 综合分</span>
                      </div>
                      {currentResult.currentScore !== undefined && (
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          本次单轮实测: <b className="text-zinc-900 font-bold">{currentResult.currentScore}分</b>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2">
                        {currentResult.verdict === "PASS" ? (
                          <span className="rounded-full border border-emerald-300 bg-emerald-600 px-3 py-0.5 font-mono text-xs font-bold text-white uppercase shadow-2xs">
                            ✅ 质检合格
                          </span>
                        ) : currentResult.verdict === "WARNING" ? (
                          <span className="rounded-full border border-amber-300 bg-amber-500 px-3 py-0.5 font-mono text-xs font-bold text-white uppercase shadow-2xs">
                            {currentResult.outcomeCode === "juice_mismatch_fingerprint_strong"
                              ? "⚠️ 疑似型号混用"
                              : currentResult.promptOverrideDetected
                              ? "⚠️ Prompt 覆盖风险"
                              : "⚠️ 指纹参考验证"}
                          </span>
                        ) : (
                          <span className="rounded-full border border-rose-300 bg-rose-600 px-3 py-0.5 font-mono text-xs font-bold text-white uppercase shadow-2xs">
                            ❌ 质检不合格
                          </span>
                        )}
                        {currentResult.outcomeCode && (
                          <span className="rounded-full border border-zinc-300 bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white tracking-wider">
                            {currentResult.outcomeCode}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-zinc-800">
                          {currentResult.siteName} ({currentResult.declaredModel})
                        </span>
                      </div>

                      <p className="text-sm font-bold text-zinc-800 mt-1.5 leading-snug">
                        {currentResult.verdictText}
                      </p>

                      {/* Multi-run Telemetry Stats */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5 font-mono text-[11px]">
                        <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-zinc-700 font-bold shadow-2xs">
                          📊 综合加权: {currentResult.historicalRounds || 1} 轮 ({currentResult.totalSamples || currentResult.sampleCount} 探针样本)
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 font-bold shadow-2xs ${
                          currentResult.confidence === "high"
                            ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                            : currentResult.confidence === "medium"
                            ? "border-blue-200 bg-blue-100 text-blue-900"
                            : "border-zinc-200 bg-white text-zinc-700"
                        }`}>
                          🎯 置信度: {currentResult.confidence === "high" ? "高" : currentResult.confidence === "medium" ? "中" : "低"}
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-100 text-emerald-900 px-2.5 py-0.5 font-bold shadow-2xs">
                          ✅ 多轮通过率: {currentResult.passRate ?? 100}%
                        </span>
                        {(currentResult.historicalRounds || 1) > 1 && currentResult.scoreMin !== undefined && (
                          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-zinc-600 shadow-2xs">
                            历史波动: {currentResult.scoreMin} ~ {currentResult.scoreMax}分
                          </span>
                        )}
                      </div>

                      {currentResult.scoreDeductions && currentResult.scoreDeductions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-black/10 text-xs font-mono space-y-1">
                          <div className="font-bold text-zinc-600 text-[11px]">📋 评分扣分明细解析：</div>
                          {currentResult.scoreDeductions.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-rose-950 font-bold text-[11px]">
                              <span className="rounded bg-rose-200 text-rose-900 px-1.5 py-0.2 border border-rose-300 text-[10px]">
                                {d.pts}分
                              </span>
                              <span>[{d.item}] {d.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Copy Markdown Report Button */}
                    <div className="ml-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs transition-all"
                        title="复制 Markdown 格式质检凭证"
                      >
                        {copiedReport ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">已复制凭证</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-zinc-400" />
                            <span>复制质检凭证</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  {/* Juice Signature */}
                  <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-4 shadow-2xs">
                    <div className="font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center justify-between">
                      <span>⚡ Juice 思考段结构指纹</span>
                      <Layers className="h-4 w-4 text-zinc-400" />
                    </div>
                    <p className="font-bold text-sm text-zinc-900 mb-1.5">
                      {currentResult.juiceVerdict}
                    </p>
                    <div className="text-zinc-500 text-[11px]">
                      匹配规则: Sol(high=40) | Terra(high=32) | Luna(high=48)
                    </div>
                  </div>

                  {/* Model Behavior Distribution */}
                  <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-4 shadow-2xs">
                    <div className="font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center justify-between">
                      <span>📊 行为指纹匹配度</span>
                      {currentResult.probabilitiesEstimated && (
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-500 normal-case">
                          未达强门禁 · 仅供参考
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-zinc-900 mb-2">
                      {currentResult.behaviorVerdict}
                    </p>
                    <div className="text-zinc-400 text-[10px] mb-2">与官方可信答案分布的相对接近度 (softmax)，非路由概率</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-right font-bold text-zinc-700">Sol</span>
                        <div className="flex-1 bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-[#E03E1A] h-full rounded-full transition-all" style={{ width: `${currentResult.probabilities.sol}%` }} />
                        </div>
                        <span className="w-10 font-bold text-right text-zinc-900">{currentResult.probabilities.sol}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-right font-bold text-zinc-700">Terra</span>
                        <div className="flex-1 bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-zinc-800 h-full rounded-full transition-all" style={{ width: `${currentResult.probabilities.terra}%` }} />
                        </div>
                        <span className="w-10 font-bold text-right text-zinc-900">{currentResult.probabilities.terra}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-right font-bold text-zinc-700">Luna</span>
                        <div className="flex-1 bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-zinc-400 h-full rounded-full transition-all" style={{ width: `${currentResult.probabilities.luna}%` }} />
                        </div>
                        <span className="w-10 font-bold text-right text-zinc-900">{currentResult.probabilities.luna}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Tampering check */}
                  <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-4 shadow-2xs">
                    <div className="font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      🔍 32/48 改写篡改监测
                    </div>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {currentResult.tamperDetected ? (
                        <>
                          <XCircle className="h-4 w-4 text-rose-600" />
                          <span className="text-rose-700">检测到前缀篡改 (强行补40前缀)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-800">输出完整性正常 (未改写)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* System Prompt Hijack check */}
                  <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-4 shadow-2xs">
                    <div className="font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      🛡️ 代理侧 Prompt 覆盖检查
                    </div>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {currentResult.promptOverrideDetected ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-amber-800">隐蔽覆盖风险 (System Prompt 被截断)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-800">System Prompt 完美生效</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Metadata forensics */}
                  {currentResult.metadataFindings && (
                    <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-4 md:col-span-2 shadow-2xs">
                      <div className="font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center justify-between">
                        <span>🔬 元数据取证 (协议层指纹)</span>
                        {currentResult.metadataFindings.crossProviderResidue || currentResult.metadataFindings.modelEchoMismatchCount > 0 ? (
                          <XCircle className="h-4 w-4 text-rose-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                      {currentResult.metadataFindings.crossProviderResidue ? (
                        <p className="font-bold text-sm text-rose-700 mb-1">
                          🚨 响应结构含异供应商命名: {(currentResult.metadataFindings.residueKeys ?? []).join(", ")} — 疑似跨供应商转发
                        </p>
                      ) : (
                        <p className="font-bold text-sm text-emerald-800 mb-1">✅ usage/响应结构无跨供应商残留</p>
                      )}
                      <div className="text-zinc-600 text-[11px]">
                        model 回显一致性:{" "}
                        {currentResult.metadataFindings.modelEchoMismatchCount > 0 ? (
                          <b className="text-amber-700">{currentResult.metadataFindings.modelEchoMismatchCount} 次与申报家族不一致 (样本: {(currentResult.metadataFindings.modelEchoSamples ?? []).join(" / ")})</b>
                        ) : (
                          "一致"
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : errorMsg ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 flex flex-col items-center justify-center text-center font-mono my-auto py-10 space-y-3">
                <AlertTriangle className="h-10 w-10 text-amber-600 mb-1" />
                <h4 className="text-base sm:text-lg font-bold text-amber-950">
                  探针未响应 / 请求超时
                </h4>
                <p className="text-xs font-medium text-amber-900 max-w-md">
                  {errorMsg}
                </p>
                <div className="border-t border-amber-200 pt-3 max-w-md text-[11px] text-amber-800 leading-relaxed">
                  💡 <b>客观说明</b>：单次超时可能由临时网络波动、官方风控限流、IP 拦截或上游路由引起，<b>不一定代表站点服务故障</b>。建议稍后重试。
                </div>
                <button
                  type="button"
                  onClick={runDetection}
                  disabled={isRunning}
                  className="mt-2 rounded-xl border border-zinc-900 bg-zinc-900 text-white px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#E03E1A] transition-colors flex items-center gap-2 shadow-xs"
                >
                  <RotateCw className="h-3.5 w-3.5" /> 重新测试该端点
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 font-mono">
                <Activity className="h-8 w-8 animate-pulse mb-3 text-[#E03E1A]" />
                <p className="font-bold text-sm text-zinc-700">探针测试正在实时执行中...</p>
                <p className="text-xs text-zinc-400 mt-1">请关注右侧终端日志实时输出</p>
              </div>
            )}
          </div>

          {/* Right: Live Terminal Console */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-200 p-5 sm:p-6 flex flex-col font-mono text-xs shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#E03E1A]" />
                <span className="font-bold uppercase tracking-wider text-zinc-300">探针实时打点终端</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div
              ref={terminalLogsRef}
              className="flex-1 rounded-2xl bg-zinc-900/90 border border-zinc-850 p-3.5 overflow-y-auto max-h-[380px] space-y-2 font-mono text-[11px] leading-relaxed shadow-inner"
            >
              {liveLogs.map((log, i) => (
                <div
                  key={i}
                  className={`${
                    log.includes("❌")
                      ? "text-rose-400 font-bold"
                      : log.includes("⚠️") || log.includes("🚨")
                      ? "text-amber-300 font-bold"
                      : log.includes("✅")
                      ? "text-emerald-400 font-bold"
                      : "text-zinc-300"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 03. Site Quality Inspection Telemetry Archive ──────────────── */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 pb-4 mb-6">
          <div>
            <span className="font-mono text-xs font-bold uppercase text-[#E03E1A] tracking-wider">
              TELEMETRY ARCHIVE
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 mt-1">
              全量中转站模型真实性质检数据表 (档案快照)
            </h3>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            已收录 {qcHistory.length} 个站点的实测真实性快照
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 shadow-2xs">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 font-bold uppercase text-[11px]">
                <th className="p-3.5">站点名称</th>
                <th className="p-3.5">域名</th>
                <th className="p-3.5">测试型号</th>
                <th className="p-3.5 text-center">多轮综合评分</th>
                <th className="p-3.5">质检结论</th>
                <th className="p-3.5">Juice & 行为匹配</th>
                <th className="p-3.5 text-right">最后质检</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {qcHistory.map((qc) => (
                <tr key={qc.siteId} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="p-3.5 font-bold text-zinc-900">
                    {qc.siteName}
                  </td>
                  <td className="p-3.5 text-zinc-500">{qc.domain || "—"}</td>
                  <td className="p-3.5 font-bold text-zinc-800">{qc.declaredModel}</td>
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 font-bold ${
                          qc.score >= 90
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : qc.score >= 75
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                      >
                        {qc.score}分
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        {qc.historicalRounds || 1} 轮样本
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 font-bold">
                    {qc.verdict === "PASS" ? (
                      <span className="text-emerald-700">✅ {qc.verdictText}</span>
                    ) : qc.verdict === "WARNING" ? (
                      <span className="text-amber-700">⚠️ {qc.verdictText}</span>
                    ) : (
                      <span className="text-rose-700">❌ {qc.verdictText}</span>
                    )}
                  </td>
                  <td className="p-3.5 text-zinc-600 max-w-xs truncate">
                    {qc.behaviorVerdict}
                  </td>
                  <td className="p-3.5 text-right text-zinc-400">
                    {new Date(qc.testedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

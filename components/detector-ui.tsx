"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Play, Save, CheckCircle2, AlertTriangle, XCircle, Terminal, Activity, ChevronRight, Lock, Key, Globe, Layers, Search, X, ChevronDown, RotateCw, Copy, Check } from "lucide-react";
import type { QCRecord } from "@/lib/qc-store";

interface SiteOption {
  siteId: string;
  name: string;
  domain: string;
}

interface DetectorUIProps {
  initialQCRecords: QCRecord[];
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
  const [qcHistory, setQcHistory] = useState<QCRecord[]>(initialQCRecords);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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
    setSaveStatus(null);
    setLiveLogs([`${new Date().toLocaleTimeString()} 正在建立质检探针连接...`]);

    // 触发质检后平滑滚动到报告区域上方（留出 80px 顶部间隙，视角开阔自然）
    setTimeout(() => {
      if (reportSectionRef.current) {
        const top = reportSectionRef.current.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    }, 150);

    const targetSite = sitesList.find((s) => s.siteId === selectedSiteId);

    try {
      const res = await fetch("/api/detect", {
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
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || "连接超时或端点未响应");
        if (data.logs) {
          setLiveLogs(data.logs);
        } else {
          setLiveLogs((prev) => [...prev, `❌ 检测失败: ${data.error}`]);
        }
        setCurrentResult(null);
      } else {
        const record = data.record as QCRecord;
        setCurrentResult(record);
        setErrorMsg(null);
        if (record.logs) {
          setLiveLogs(record.logs);
        }
        if (selectedSiteId) {
          setQcHistory((prev) => [
            record,
            ...prev.filter((r) => r.siteId !== record.siteId),
          ]);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`网络连通失败: ${msg}`);
      setLiveLogs((prev) => [...prev, `❌ 网络请求异常: ${msg}`]);
      setCurrentResult(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleFeedbackSave = async () => {
    if (!currentResult) return;
    setSaveStatus("saving");
    try {
      const targetSite = sitesList.find((s) => s.siteId === selectedSiteId);
      const payload: QCRecord = {
        ...currentResult,
        siteId: selectedSiteId || currentResult.siteId || "custom",
        siteName: targetSite?.name || currentResult.siteName || "自定义站点",
        domain: targetSite?.domain || currentResult.domain,
        source: "user_probe",
        isInternalFeedback: true,
        submissionType: "user_submission",
      };

      const res = await fetch("/api/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSaveStatus("saved");
        setQcHistory((prev) => [
          data.record,
          ...prev.filter((r) => r.siteId !== data.record.siteId),
        ]);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        alert(`保存失败: ${data.error}`);
        setSaveStatus(null);
      }
    } catch (err) {
      alert(`保存异常: ${err instanceof Error ? err.message : err}`);
      setSaveStatus(null);
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
      `- **固有行为匹配**: Sol ${currentResult.probabilities.sol}% | Terra ${currentResult.probabilities.terra}% | Luna ${currentResult.probabilities.luna}%`,
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
    <div className="space-y-8">
      {/* ── 01. Form Area ─────────────────────────────────────────────── */}
      <section className="border-2 border-black bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="bg-swiss-accent px-3 py-1 font-mono text-xs font-black text-white uppercase tracking-wider">
              ONLINE PROBE
            </span>
            <h2 className="text-xl md:text-2xl font-black text-black">
              发起在线模型真实性与混用质检
            </h2>
          </div>
          <span className="font-mono text-xs text-black/50">
            探针指纹引擎: GPT-5.6 / Juice v4.1 (无须可信端)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Searchable Site Combobox */}
          <div className="relative" ref={siteDropdownRef}>
            <label className="block font-mono text-xs font-black uppercase tracking-wider text-black/70 mb-2 flex items-center justify-between">
              <span>关联中转大盘站点 ({sitesList.length} 站可搜索)</span>
              <Search className="h-3.5 w-3.5 text-black/40" />
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
                className="w-full border-2 border-black bg-[#F8F8F6] px-3 py-2 pr-16 font-mono text-sm font-bold text-black focus:outline-none focus:border-swiss-accent"
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
                    className="p-1 hover:bg-black/10 font-mono text-xs font-black text-black/60"
                    title="清除选择"
                  >
                    <X className="h-3.5 w-3.5 text-black/60" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSiteOpen(!isSiteOpen)}
                  className="p-1 hover:bg-black/10"
                >
                  <ChevronDown className="h-4 w-4 text-black/60" />
                </button>
              </div>
            </div>

            {isSiteOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-64 overflow-y-auto">
                <div className="p-2 border-b border-black/10 bg-[#F8F8F6] font-mono text-[10px] font-bold text-black/60 flex items-center justify-between">
                  <span>匹配结果 ({filteredSites.length} / {sitesList.length})</span>
                  {selectedSiteId && <span>已选: {selectedSite?.name}</span>}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSiteId("");
                    setIsSiteOpen(false);
                    setSiteSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 border-b border-black/10 font-mono text-xs font-bold hover:bg-black hover:text-white transition-colors ${
                    !selectedSiteId ? "bg-black/5 font-black" : ""
                  }`}
                >
                  -- 手动自填 API 地址 --
                </button>

                {filteredSites.length === 0 ? (
                  <div className="p-4 font-mono text-xs text-center text-black/50">
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
                      className={`w-full text-left px-3 py-2 border-b border-black/5 font-mono text-xs transition-colors flex items-center justify-between group hover:bg-black hover:text-white ${
                        selectedSiteId === site.siteId ? "bg-swiss-accent/10 border-l-4 border-l-swiss-accent font-black" : ""
                      }`}
                    >
                      <div>
                        <span className="font-bold text-black group-hover:text-white">{site.name}</span>
                        <span className="ml-2 text-black/50 group-hover:text-white/70 text-[11px]">{site.domain}</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase text-black/40 group-hover:text-white/60">
                        ID: {site.siteId}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <p className="mt-1 font-mono text-[10px] text-black/50">
              支持拼音/英文域名模糊搜索 165+ 站点，选择后自动填入 URL
            </p>
          </div>

          {/* API Base URL */}
          <div>
            <label className="block font-mono text-xs font-black uppercase tracking-wider text-black/70 mb-2 flex items-center justify-between">
              <span>API Base URL *</span>
              <Globe className="h-3.5 w-3.5 text-black/40" />
            </label>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full border-2 border-black bg-[#F8F8F6] px-3 py-2 font-mono text-sm font-bold text-black focus:outline-none focus:border-swiss-accent"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block font-mono text-xs font-black uppercase tracking-wider text-black/70 mb-2 flex items-center justify-between">
              <span>API Key * (绝不持久化落盘)</span>
              <Key className="h-3.5 w-3.5 text-black/40" />
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full border-2 border-black bg-[#F8F8F6] px-3 py-2 pr-16 font-mono text-sm font-bold text-black focus:outline-none focus:border-swiss-accent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-black/60 hover:text-black uppercase border border-black/20 px-1.5 py-0.5 bg-white"
              >
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>
          </div>

          {/* Standard Model */}
          <div>
            <label className="block font-mono text-xs font-black uppercase tracking-wider text-black/70 mb-2">
              申报标准模型 (Standard Model)
            </label>
            <select
              value={declaredModel}
              onChange={(e) => setDeclaredModel(e.target.value)}
              className="w-full border-2 border-black bg-[#F8F8F6] px-3 py-2 font-mono text-sm font-bold text-black focus:outline-none focus:border-swiss-accent"
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
            <label className="block font-mono text-xs font-black uppercase tracking-wider text-black/70 mb-2">
              实际请求模型别名 (可选)
            </label>
            <input
              type="text"
              placeholder="留空同申报模型 (如 custom-sol)"
              value={testedModel}
              onChange={(e) => setTestedModel(e.target.value)}
              className="w-full border-2 border-black bg-[#F8F8F6] px-3 py-2 font-mono text-sm font-bold text-black focus:outline-none focus:border-swiss-accent"
            />
          </div>

          {/* Test Preset */}
          <div>
            <label className="block font-mono text-xs font-black uppercase tracking-wider text-black/70 mb-2">
              探针测试档位 (Probe Preset)
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {(["quick", "standard", "full"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`border-2 border-black py-2 font-black uppercase transition-colors ${
                    preset === p ? "bg-black text-white" : "bg-white text-black hover:bg-black/10"
                  }`}
                >
                  {p === "quick" ? "极速" : p === "standard" ? "常规" : "高档"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-wrap items-center justify-between border-t-2 border-black/10 pt-4">
          <p className="font-mono text-xs text-black/50">
            🔒 提示: API Key 仅存储于当前浏览器内存，完成测试后随页面关闭自动销毁。
          </p>
          <button
            type="button"
            disabled={isRunning}
            onClick={runDetection}
            className={`flex items-center gap-2 border-2 border-black px-8 py-3 font-mono text-sm font-black uppercase tracking-wider transition-all ${
              isRunning
                ? "bg-black/30 text-white cursor-not-allowed"
                : "bg-swiss-accent text-white hover:bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
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
          <div className="lg:col-span-2 border-2 border-black bg-white p-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-swiss-accent" />
                <h3 className="text-lg font-black uppercase tracking-tight text-black">
                  质检评估报告 · Inspection Verdict
                </h3>
              </div>
              {currentResult && (
                <span className="font-mono text-xs text-black/40">
                  测试时间: {new Date(currentResult.testedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {currentResult ? (
              <div className="space-y-6">
                {/* Score & Verdict Banner */}
                <div
                  className={`border-2 border-black p-5 ${
                    currentResult.verdict === "PASS"
                      ? "bg-emerald-50 border-emerald-950"
                      : currentResult.verdict === "WARNING"
                      ? "bg-amber-50 border-amber-950"
                      : "bg-rose-50 border-rose-950"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <div className="font-mono text-4xl font-black text-black flex items-baseline gap-1.5">
                        <span>{currentResult.score}</span>
                        <span className="text-xs text-black/50 font-bold uppercase tracking-wider">/ 100 综合分</span>
                      </div>
                      {currentResult.currentScore !== undefined && (
                        <div className="text-[11px] font-mono text-black/60 mt-0.5">
                          本次单轮实测: <b className="text-black font-black">{currentResult.currentScore}分</b>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {currentResult.verdict === "PASS" ? (
                          <span className="border border-emerald-800 bg-emerald-700 px-2.5 py-0.5 font-mono text-xs font-black text-white uppercase">
                            ✅ 质检合格
                          </span>
                        ) : currentResult.verdict === "WARNING" ? (
                          <span className="border border-amber-800 bg-amber-600 px-2.5 py-0.5 font-mono text-xs font-black text-white uppercase">
                            {currentResult.outcomeCode === "juice_mismatch_fingerprint_strong"
                              ? "⚠️ 疑似型号混用"
                              : currentResult.promptOverrideDetected
                              ? "⚠️ Prompt 覆盖风险"
                              : "⚠️ 指纹参考验证"}
                          </span>
                        ) : (
                          <span className="border border-rose-800 bg-rose-700 px-2.5 py-0.5 font-mono text-xs font-black text-white uppercase">
                            ❌ 质检不合格
                          </span>
                        )}
                        {currentResult.outcomeCode && (
                          <span className="border border-black bg-black px-2 py-0.5 font-mono text-[10px] font-bold text-white tracking-wider">
                            {currentResult.outcomeCode}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-black/80">
                          {currentResult.siteName} ({currentResult.declaredModel})
                        </span>
                      </div>

                      <p className="text-sm font-bold text-black/80 mt-1">
                        {currentResult.verdictText}
                      </p>

                      {/* Multi-run Telemetry Stats */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-[11px]">
                        <span className="border border-black/20 bg-white px-2 py-0.5 text-black font-bold">
                          📊 综合加权: {currentResult.historicalRounds || 1} 轮 ({currentResult.totalSamples || currentResult.sampleCount} 探针样本)
                        </span>
                        <span className="border border-emerald-900 bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold">
                          ✅ 多轮通过率: {currentResult.passRate ?? 100}%
                        </span>
                        {(currentResult.historicalRounds || 1) > 1 && currentResult.scoreMin !== undefined && (
                          <span className="border border-black/20 bg-white px-2 py-0.5 text-black/70">
                            历史波动: {currentResult.scoreMin} ~ {currentResult.scoreMax}分
                          </span>
                        )}
                      </div>
                      {currentResult.scoreDeductions && currentResult.scoreDeductions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-black/10 text-xs font-mono space-y-1">
                          <div className="font-bold text-black/60 text-[11px]">📋 评分扣分明细解析：</div>
                          {currentResult.scoreDeductions.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-rose-950 font-bold text-[11px]">
                              <span className="bg-rose-200 text-rose-900 px-1.5 py-0.2 border border-rose-400 text-[10px]">
                                {d.pts}分
                              </span>
                              <span>[{d.item}] {d.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Copy Markdown Report Button */}
                    <div className="ml-auto">
                      <button
                        type="button"
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 font-mono text-xs font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-colors"
                        title="复制 Markdown 格式质检凭证"
                      >
                        {copiedReport ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">已复制凭证</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-black/70" />
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
                  <div className="border-2 border-black p-4 bg-[#F8F8F6]">
                    <div className="font-black uppercase tracking-wider text-black/60 mb-2 flex items-center justify-between">
                      <span>⚡ Juice 思考段结构指纹</span>
                      <Layers className="h-4 w-4 text-black/40" />
                    </div>
                    <p className="font-bold text-sm text-black mb-2">
                      {currentResult.juiceVerdict}
                    </p>
                    <div className="text-black/60 text-[11px]">
                      匹配规则: Sol(high=40) | Terra(high=32) | Luna(high=48)
                    </div>
                  </div>

                  {/* Model Behavior Distribution */}
                  <div className="border-2 border-black p-4 bg-[#F8F8F6]">
                    <div className="font-black uppercase tracking-wider text-black/60 mb-2">
                      📊 固有行为匹配分布
                    </div>
                    <p className="font-bold text-sm text-black mb-3">
                      {currentResult.behaviorVerdict}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-right font-bold">Sol</span>
                        <div className="flex-1 bg-black/10 h-3 border border-black/30 overflow-hidden">
                          <div className="bg-swiss-accent h-full" style={{ width: `${currentResult.probabilities.sol}%` }} />
                        </div>
                        <span className="w-10 font-bold text-right">{currentResult.probabilities.sol}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-right font-bold">Terra</span>
                        <div className="flex-1 bg-black/10 h-3 border border-black/30 overflow-hidden">
                          <div className="bg-black h-full" style={{ width: `${currentResult.probabilities.terra}%` }} />
                        </div>
                        <span className="w-10 font-bold text-right">{currentResult.probabilities.terra}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-right font-bold">Luna</span>
                        <div className="flex-1 bg-black/10 h-3 border border-black/30 overflow-hidden">
                          <div className="bg-black/40 h-full" style={{ width: `${currentResult.probabilities.luna}%` }} />
                        </div>
                        <span className="w-10 font-bold text-right">{currentResult.probabilities.luna}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Tampering check */}
                  <div className="border-2 border-black p-4 bg-[#F8F8F6]">
                    <div className="font-black uppercase tracking-wider text-black/60 mb-2">
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
                  <div className="border-2 border-black p-4 bg-[#F8F8F6]">
                    <div className="font-black uppercase tracking-wider text-black/60 mb-2">
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
                </div>
              </div>
            ) : errorMsg ? (
              <div className="border-2 border-amber-950 bg-amber-50/90 p-6 flex flex-col items-center justify-center text-center font-mono my-auto py-10 space-y-3">
                <AlertTriangle className="h-10 w-10 text-amber-600 mb-1" />
                <h4 className="text-base md:text-lg font-black text-amber-950">
                  探针未响应 / 请求超时
                </h4>
                <p className="text-xs font-bold text-amber-900 max-w-md">
                  {errorMsg}
                </p>
                <div className="border-t border-amber-900/20 pt-3 max-w-md text-[11px] text-amber-950/80 leading-relaxed">
                  💡 <b>客观说明</b>：单次超时可能由临时网络波动、官方风控限流、IP 拦截或上游路由引起，<b>不一定代表站点服务故障</b>。建议稍后重试。
                </div>
                <button
                  type="button"
                  onClick={runDetection}
                  disabled={isRunning}
                  className="mt-2 border-2 border-black bg-black text-white px-5 py-2 font-mono text-xs font-black uppercase tracking-wider hover:bg-swiss-accent transition-colors flex items-center gap-2"
                >
                  <RotateCw className="h-3.5 w-3.5" /> 重新测试该端点
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-black/40 font-mono">
                <Activity className="h-8 w-8 animate-pulse mb-3 text-swiss-accent" />
                <p className="font-bold text-sm">探针测试正在实时执行中...</p>
                <p className="text-xs text-black/50 mt-1">请关注右侧终端日志实时输出</p>
              </div>
            )}
          </div>

          {/* Right: Live Terminal Console */}
          <div className="border-2 border-black bg-black text-white p-5 flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-swiss-accent" />
                <span className="font-black uppercase tracking-wider">探针实时打点终端</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div
              ref={terminalLogsRef}
              className="flex-1 bg-black/60 border border-white/10 p-3 overflow-y-auto max-h-[360px] space-y-2 font-mono text-[11px] leading-relaxed"
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
                      : "text-white/80"
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
      <section className="border-2 border-black bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div>
            <span className="font-mono text-xs font-black uppercase text-swiss-accent tracking-wider">
              TELEMETRY ARCHIVE
            </span>
            <h3 className="text-xl font-black text-black mt-1">
              全量中转站模型真实性质检数据表 (档案快照)
            </h3>
          </div>
          <span className="font-mono text-xs text-black/50">
            已收录 {qcHistory.length} 个站点的实测真实性快照
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-black">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-black text-white font-black uppercase">
                <th className="p-3">站点名称</th>
                <th className="p-3">域名</th>
                <th className="p-3">测试型号</th>
                <th className="p-3 text-center">多轮综合评分</th>
                <th className="p-3">质检结论</th>
                <th className="p-3">Juice & 行为匹配</th>
                <th className="p-3 text-right">最后质检</th>
              </tr>
            </thead>
            <tbody className="divide-y border-black">
              {qcHistory.map((qc) => (
                <tr key={qc.siteId} className="hover:bg-swiss-muted/60 transition-colors">
                  <td className="p-3 font-bold text-black flex items-center gap-2">
                    {qc.siteName}
                  </td>
                  <td className="p-3 text-black/70">{qc.domain || "—"}</td>
                  <td className="p-3 font-bold text-black">{qc.declaredModel}</td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={`inline-block border px-2 py-0.5 font-black ${
                          qc.score >= 90
                            ? "bg-emerald-100 border-emerald-800 text-emerald-950"
                            : qc.score >= 75
                            ? "bg-amber-100 border-amber-800 text-amber-950"
                            : "bg-rose-100 border-rose-800 text-rose-950"
                        }`}
                      >
                        {qc.score}分
                      </span>
                      <span className="text-[10px] text-black/50 mt-0.5">
                        {qc.historicalRounds || 1} 轮样本
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-bold">
                    {qc.verdict === "PASS" ? (
                      <span className="text-emerald-700">✅ {qc.verdictText}</span>
                    ) : qc.verdict === "WARNING" ? (
                      <span className="text-amber-700">⚠️ {qc.verdictText}</span>
                    ) : (
                      <span className="text-rose-700">❌ {qc.verdictText}</span>
                    )}
                  </td>
                  <td className="p-3 text-black/70 max-w-xs truncate">
                    {qc.behaviorVerdict}
                  </td>
                  <td className="p-3 text-right text-black/50">
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

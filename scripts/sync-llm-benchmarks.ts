// 大模型测评天梯榜同步脚本 —— 写入飞书 bitable 并同步本地数据
// 运行：npx tsx scripts/sync-llm-benchmarks.ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { ModelBenchmarkRecord } from "../lib/benchmarks";

export type { ModelBenchmarkRecord };

const rawKbToken = process.env.FEISHU_BASE_TOKEN ?? process.env.FEISHU_KB_TOKEN ?? process.env.KB_TOKEN;
const KB_TOKEN = (rawKbToken && !rawKbToken.includes("…")) ? rawKbToken : "SchGbU6UDaT5q9sDjHTct79Sn9d";
const LARK_AS = process.env.LARK_AS ?? "bot";
const TABLE_NAME = "llm_benchmarks";

export const BENCHMARK_MODELS: ModelBenchmarkRecord[] = [
  {
    模型名称: "Claude 3.7 Sonnet (Thinking)",
    厂商: "Anthropic",
    家族系列: "Claude",
    模型定位: "混合思考推理",
    梯队评级: "S+ 顶尖旗舰",
    LMSYS总榜Elo: 1300.6,
    LMSYS代码Elo: 1339.2,
    LMSYS数学Elo: 1323.0,
    SWE_bench_Verified: 70.3,
    AIME_2024: 80.0,
    GPQA_Diamond: 84.8,
    MATH_500: 96.2,
    上下文窗口: "200K",
    最大输出: "128K",
    输入价格_美元: 3.00,
    输出价格_美元: 15.00,
    核心优势: "首创普通/思考双模无缝整合；真实前端全栈开发与真实仓库 SWE-bench Verified 达 70.3% 历史新高；支持长达 128K 完整思考与超强工具调度。",
    短板风险: "深度思考模式下若不设限，Thinking Token 消耗极快；极少数极限高数问题略逊于 o3-mini。",
    推荐场景: "生产级 Agentic Coding、全栈架构重构、Claude Code 终端调度、复杂长流程自动化。",
    官方发布时间: "2025-02",
  },
  {
    模型名称: "Claude 3.5 Sonnet (1022)",
    厂商: "Anthropic",
    家族系列: "Claude",
    模型定位: "通用旗舰多模态",
    梯队评级: "S 头部第一梯队",
    LMSYS总榜Elo: 1299.7,
    LMSYS代码Elo: 1339.5,
    LMSYS数学Elo: 1311.4,
    SWE_bench_Verified: 50.8,
    AIME_2024: 16.0,
    GPQA_Diamond: 65.0,
    MATH_500: 78.3,
    上下文窗口: "200K",
    最大输出: "8K",
    输入价格_美元: 3.00,
    输出价格_美元: 15.00,
    核心优势: "日常敏捷代码标杆，生成速度快，无思考等待延迟；UI 审美设计水准业界公认一流。",
    短板风险: "非思考模型，纯奥数与复杂多步数理证明不及新一代思考模型；输出上限为 8K。",
    推荐场景: "日常高频编程助手、前端 UI 交互还原、长文结构化解析、中大型文件重构。",
    官方发布时间: "2024-10",
  },
  {
    模型名称: "Claude 3.5 Haiku",
    厂商: "Anthropic",
    家族系列: "Claude",
    模型定位: "性价比轻量",
    梯队评级: "A+ 高性价比主力",
    LMSYS总榜Elo: 1256.4,
    LMSYS代码Elo: 1287.2,
    LMSYS数学Elo: 1248.9,
    SWE_bench_Verified: 40.6,
    AIME_2024: 11.2,
    GPQA_Diamond: 41.6,
    MATH_500: 69.2,
    上下文窗口: "200K",
    最大输出: "8K",
    输入价格_美元: 0.80,
    输出价格_美元: 4.00,
    核心优势: "极速首字响应 TTFT，轻量级模型中编码与复杂指令遵循顶级，支持原生 200K 上下文。",
    短板风险: "价格相较前代 Haiku 略有上浮；超难学术与极限逻辑问题容易简化回答。",
    推荐场景: "高并发智能体子任务、实时文档抽取、实时代码语法纠错、大流量过滤网关。",
    官方发布时间: "2024-10",
  },
  {
    模型名称: "OpenAI o3-mini (High)",
    厂商: "OpenAI",
    家族系列: "GPT",
    模型定位: "深度思考推理",
    梯队评级: "S+ 顶尖旗舰",
    LMSYS总榜Elo: 1420.7,
    LMSYS代码Elo: 1437.9,
    LMSYS数学Elo: 1441.8,
    SWE_bench_Verified: 49.3,
    AIME_2024: 87.3,
    GPQA_Diamond: 79.7,
    MATH_500: 95.8,
    上下文窗口: "200K",
    最大输出: "100K",
    输入价格_美元: 1.10,
    输出价格_美元: 4.40,
    核心优势: "数学奥赛 AIME 达 87.3% 行业登顶；算法与逻辑推导极其强悍；价格仅为 o1 的 1/14。",
    短板风险: "纯文本模型，不支持多模态图像识别；回答风格偏严肃学术，缺乏文笔润色。",
    推荐场景: "算法竞赛攻坚、数学定理推导、后端核心业务逻辑 Debug、严苛学术验证。",
    官方发布时间: "2025-01",
  },
  {
    模型名称: "OpenAI o1 (Full)",
    厂商: "OpenAI",
    家族系列: "GPT",
    模型定位: "深度思考推理",
    梯队评级: "S+ 顶尖旗舰",
    LMSYS总榜Elo: 1365.9,
    LMSYS代码Elo: 1377.5,
    LMSYS数学Elo: 1392.1,
    SWE_bench_Verified: 48.9,
    AIME_2024: 79.2,
    GPQA_Diamond: 75.7,
    MATH_500: 96.4,
    上下文窗口: "200K",
    最大输出: "100K",
    输入价格_美元: 15.00,
    输出价格_美元: 60.00,
    核心优势: "具备视觉多模态深层思考推演能力；博士级科学评测 GPQA 顶尖；复杂科学论文拆解力极强。",
    短板风险: "单价极度昂贵（输出 $60/1M）；首字响应需等待几十秒完整 CoT 思维链。",
    推荐场景: "多模态复杂图表/文献深度推理、高价值医疗与生物化学研究、疑难漏洞根因分析。",
    官方发布时间: "2024-12",
  },
  {
    模型名称: "GPT-4o (2024-11-20)",
    厂商: "OpenAI",
    家族系列: "GPT",
    模型定位: "通用旗舰多模态",
    梯队评级: "S 头部第一梯队",
    LMSYS总榜Elo: 1429.4,
    LMSYS代码Elo: 1434.7,
    LMSYS数学Elo: 1395.8,
    SWE_bench_Verified: 38.8,
    AIME_2024: 9.3,
    GPQA_Diamond: 49.9,
    MATH_500: 74.6,
    上下文窗口: "128K",
    最大输出: "16K",
    输入价格_美元: 2.50,
    输出价格_美元: 10.00,
    核心优势: "全模态交互自然度极高；LMSYS 竞技场综合高居 1429；生态工具插件兼容性最广。",
    短板风险: "没有显式长思考，复杂长链路编程容易漏解或过度概括；纯理科逻辑落后于思考模型。",
    推荐场景: "通用智能助手、日常创意文案、跨语种翻译、图文多模态交互。",
    官方发布时间: "2024-11",
  },
  {
    模型名称: "GPT-4.5 Preview",
    厂商: "OpenAI",
    家族系列: "GPT",
    模型定位: "通用旗舰多模态",
    梯队评级: "S 头部第一梯队",
    LMSYS总榜Elo: 1415.6,
    LMSYS代码Elo: 1419.1,
    LMSYS数学Elo: 1415.8,
    SWE_bench_Verified: 39.5,
    AIME_2024: 15.6,
    GPQA_Diamond: 62.5,
    MATH_500: 82.0,
    上下文窗口: "128K",
    最大输出: "16K",
    输入价格_美元: 75.00,
    输出价格_美元: 150.00,
    核心优势: "巨型参数量带来的非思考直觉与广博常识；情感细腻度与文学写作表现惊艳。",
    短板风险: "定价高昂（输出高达 $150/1M），对普通开发者性价比极低；没有长思维链推理。",
    推荐场景: "高级文学创作、深度文化历史对话、高端品牌策划、非思考复杂直觉理解。",
    官方发布时间: "2025-02",
  },
  {
    模型名称: "GPT-4o mini",
    厂商: "OpenAI",
    家族系列: "GPT",
    模型定位: "性价比轻量",
    梯队评级: "A+ 高性价比主力",
    LMSYS总榜Elo: 1289.2,
    LMSYS代码Elo: 1299.9,
    LMSYS数学Elo: 1274.3,
    SWE_bench_Verified: 23.4,
    AIME_2024: 7.2,
    GPQA_Diamond: 40.2,
    MATH_500: 70.2,
    上下文窗口: "128K",
    最大输出: "16K",
    输入价格_美元: 0.15,
    输出价格_美元: 0.60,
    核心优势: "OpenAI 官方白菜价主力（输入仅 $0.15/1M）；响应极快，高并发吞吐能力极强。",
    短板风险: "复杂逻辑容易偷懒截断；对细微指令约束把控不如 Sonnet/4o。",
    推荐场景: "大批量结构化数据清洗、低成本分类汇总、大流量基础智能客服网关。",
    官方发布时间: "2024-07",
  },
  {
    模型名称: "Google Gemini 2.5 Pro",
    厂商: "Google",
    家族系列: "Gemini",
    模型定位: "超长上下文旗舰",
    梯队评级: "S+ 顶尖旗舰",
    LMSYS总榜Elo: 1466.2,
    LMSYS代码Elo: 1469.9,
    LMSYS数学Elo: 1480.9,
    SWE_bench_Verified: 51.5,
    AIME_2024: 76.5,
    GPQA_Diamond: 74.2,
    MATH_500: 94.8,
    上下文窗口: "2000K",
    最大输出: "64K",
    输入价格_美元: 1.25,
    输出价格_美元: 5.00,
    核心优势: "LMSYS 竞技场全榜第一（1466分）；原生 200 万 Token 业界最长上下文；原生音视频/多模态理解断层领先。",
    短板风险: "直连 API 在国内网络受限；长文本推理消耗显存与时间较为显著。",
    推荐场景: "全仓库架构分析、超长财报/书籍/数小时视频精读、跨模态多源知识整合。",
    官方发布时间: "2025-03",
  },
  {
    模型名称: "Google Gemini 2.5 Flash",
    厂商: "Google",
    家族系列: "Gemini",
    模型定位: "性价比轻量",
    梯队评级: "S 头部第一梯队",
    LMSYS总榜Elo: 1408.9,
    LMSYS代码Elo: 1420.0,
    LMSYS数学Elo: 1429.0,
    SWE_bench_Verified: 42.1,
    AIME_2024: 65.0,
    GPQA_Diamond: 68.0,
    MATH_500: 91.2,
    上下文窗口: "1000K",
    最大输出: "64K",
    输入价格_美元: 0.10,
    输出价格_美元: 0.40,
    核心优势: "综合跑分进入 1400+ 顶尖档，价格却只要 $0.10/1M；标配 100 万长上下文与极快吞吐。",
    短板风险: "复杂边缘 Case 下对 Prompt 的严密性要求高于 Sonnet。",
    推荐场景: "大吞吐量智能体应用、中长文档分析、高性能实时问答系统、平价全模态处理。",
    官方发布时间: "2025-03",
  },
  {
    模型名称: "Google Gemini 2.0 Flash",
    厂商: "Google",
    家族系列: "Gemini",
    模型定位: "混合思考推理",
    梯队评级: "A+ 高性价比主力",
    LMSYS总榜Elo: 1358.2,
    LMSYS代码Elo: 1365.1,
    LMSYS数学Elo: 1357.6,
    SWE_bench_Verified: 38.0,
    AIME_2024: 58.2,
    GPQA_Diamond: 58.5,
    MATH_500: 88.0,
    上下文窗口: "1000K",
    最大输出: "8K",
    输入价格_美元: 0.10,
    输出价格_美元: 0.40,
    核心优势: "超高处理速度与低延迟，支持思考模式（Flash Thinking）；支持多模态输入与百万上下文。",
    短板风险: "极限复杂代码重构略显吃力；输出长度相对受限。",
    推荐场景: "轻量推理、多模态图表识别、实时会话流、低成本大规模生产管线。",
    官方发布时间: "2024-12",
  },
  {
    模型名称: "DeepSeek-R1 (671B)",
    厂商: "DeepSeek",
    家族系列: "DeepSeek",
    模型定位: "深度思考推理",
    梯队评级: "S+ 顶尖旗舰",
    LMSYS总榜Elo: 1424.4,
    LMSYS代码Elo: 1436.4,
    LMSYS数学Elo: 1406.5,
    SWE_bench_Verified: 49.2,
    AIME_2024: 79.8,
    GPQA_Diamond: 71.5,
    MATH_500: 97.3,
    上下文窗口: "128K",
    最大输出: "32K",
    输入价格_美元: 0.55,
    输出价格_美元: 2.19,
    核心优势: "开源强化学习里程碑；MATH-500 达 97.3% 登顶全行业；数理与复杂算法对标 o1；官方 API 极高性价比。",
    短板风险: "长文生成时思维链偶尔中英混合；高峰期易排队拥堵；目前不支持多模态图片识别。",
    推荐场景: "硬核数理建模、复杂算法推导、逻辑严密性论证、高难度代码单题攻坚。",
    官方发布时间: "2025-01",
  },
  {
    模型名称: "DeepSeek-V3 / V3.1",
    厂商: "DeepSeek",
    家族系列: "DeepSeek",
    模型定位: "通用旗舰多模态",
    梯队评级: "S 头部第一梯队",
    LMSYS总榜Elo: 1417.7,
    LMSYS代码Elo: 1436.4,
    LMSYS数学Elo: 1444.6,
    SWE_bench_Verified: 42.0,
    AIME_2024: 39.2,
    GPQA_Diamond: 59.1,
    MATH_500: 90.2,
    上下文窗口: "128K",
    最大输出: "8K",
    输入价格_美元: 0.14,
    输出价格_美元: 0.28,
    核心优势: "非思考模型中性价比断层第一；中文语言底蕴极其扎实；代码与工程落地表现卓越。",
    短板风险: "非思考模型，奥赛级复杂多步推理弱于 R1；单次输出窗口上限为 8K。",
    推荐场景: "中文长文创作、企业通用问答中枢、日常代码生成与优化、高性价比 API 替换方案。",
    官方发布时间: "2024-12",
  },
  {
    模型名称: "智谱 GLM-4.5 / GLM-4-Plus",
    厂商: "智谱AI",
    家族系列: "GLM",
    模型定位: "通用旗舰多模态",
    梯队评级: "S 头部第一梯队",
    LMSYS总榜Elo: 1429.1,
    LMSYS代码Elo: 1446.9,
    LMSYS数学Elo: 1426.8,
    SWE_bench_Verified: 33.8,
    AIME_2024: 36.5,
    GPQA_Diamond: 56.8,
    MATH_500: 88.6,
    上下文窗口: "128K",
    最大输出: "4K",
    输入价格_美元: 7.00,
    输出价格_美元: 7.00,
    核心优势: "国产自研旗舰在 LMSYS 竞技场高居 1429 分（代码 Elo 1446）；企业级 Agent 与函数调用极其成熟；中文政治商业理解深刻。",
    短板风险: "单价相较开源竞品偏高（¥50/1M）；单次最大输出 4K 较保守。",
    推荐场景: "政企合规应用、复杂 Function Call 业务工作流、严肃商业深度分析报告。",
    官方发布时间: "2024-09",
  },
  {
    模型名称: "智谱 GLM-4.5-Air",
    厂商: "智谱AI",
    家族系列: "GLM",
    模型定位: "性价比轻量",
    梯队评级: "A+ 高性价比主力",
    LMSYS总榜Elo: 1389.9,
    LMSYS代码Elo: 1414.0,
    LMSYS数学Elo: 1420.5,
    SWE_bench_Verified: 26.8,
    AIME_2024: 25.4,
    GPQA_Diamond: 48.2,
    MATH_500: 81.5,
    上下文窗口: "128K",
    最大输出: "4K",
    输入价格_美元: 0.14,
    输出价格_美元: 0.14,
    核心优势: "定价仅 ¥1/1M，但在竞技场斩获近 1390 分；速度极快，兼顾效果与成本。",
    短板风险: "超长链条逻辑推演时偶有细节丢失。",
    推荐场景: "批量大文本分析提取、高并发智能问答助手、企业后台数据流预处理。",
    官方发布时间: "2024-10",
  },
  {
    模型名称: "智谱 GLM-4-Flash",
    厂商: "智谱AI",
    家族系列: "GLM",
    模型定位: "性价比轻量",
    梯队评级: "A 轻量走量",
    LMSYS总榜Elo: 1240.5,
    LMSYS代码Elo: 1245.0,
    LMSYS数学Elo: 1225.0,
    SWE_bench_Verified: 18.5,
    AIME_2024: 12.0,
    GPQA_Diamond: 38.0,
    MATH_500: 68.0,
    上下文窗口: "128K",
    最大输出: "4K",
    输入价格_美元: 0.00,
    输出价格_美元: 0.00,
    核心优势: "官方永久免费开放；支持联网搜索与代码解释器扩展，调用零成本。",
    短板风险: "受官方免费频控限制；复杂任务生成能力有限。",
    推荐场景: "个人学习测试、开源项目演示接入、自动化定时轻量爬虫分析与翻译。",
    官方发布时间: "2024-06",
  },
  {
    模型名称: "Qwen 2.5 Max",
    厂商: "阿里云通义",
    家族系列: "Qwen",
    模型定位: "通用旗舰多模态",
    梯队评级: "S+ 顶尖旗舰",
    LMSYS总榜Elo: 1429.0,
    LMSYS代码Elo: 1460.4,
    LMSYS数学Elo: 1474.5,
    SWE_bench_Verified: 43.5,
    AIME_2024: 74.0,
    GPQA_Diamond: 68.4,
    MATH_500: 92.5,
    上下文窗口: "128K",
    最大输出: "8K",
    输入价格_美元: 2.80,
    输出价格_美元: 8.40,
    核心优势: "LMSYS 代码 Elo 1460、数学 Elo 1474 达到国产巅峰；全模态理解强，中文指令遵循稳定性极高。",
    短板风险: "闭源商业模型，价格相比开源版 72B 偏高；上下文相比 Gemini 较小。",
    推荐场景: "生产级核心业务系统、多语言高精度翻译、企业级技术文档生成、严肃数理辅助。",
    官方发布时间: "2025-01",
  },
  {
    模型名称: "Qwen 2.5 Coder 32B",
    厂商: "阿里云通义",
    家族系列: "Qwen",
    模型定位: "代码专用",
    梯队评级: "A+ 高性价比主力",
    LMSYS总榜Elo: 1235.1,
    LMSYS代码Elo: 1278.3,
    LMSYS数学Elo: 1261.3,
    SWE_bench_Verified: 35.8,
    AIME_2024: 32.0,
    GPQA_Diamond: 52.0,
    MATH_500: 82.5,
    上下文窗口: "128K",
    最大输出: "8K",
    输入价格_美元: 0.28,
    输出价格_美元: 0.84,
    核心优势: "开源可私有化单卡部署的代码模型 SOTA；各 IDE 编程插件（Cursor/Continue 等）最强本地底座。",
    短板风险: "纯代码特化，非代码通用人文与常识回答较弱。",
    推荐场景: "企业私有化代码生成、本地离线编码助手、单元测试批量编写、代码安全审计。",
    官方发布时间: "2024-11",
  },
  {
    模型名称: "xAI Grok 3",
    厂商: "xAI",
    家族系列: "Grok",
    模型定位: "深度思考推理",
    梯队评级: "S+ 顶尖旗舰",
    LMSYS总榜Elo: 1423.1,
    LMSYS代码Elo: 1440.7,
    LMSYS数学Elo: 1448.0,
    SWE_bench_Verified: 48.5,
    AIME_2024: 78.5,
    GPQA_Diamond: 72.8,
    MATH_500: 96.0,
    上下文窗口: "128K",
    最大输出: "32K",
    输入价格_美元: 3.00,
    输出价格_美元: 15.00,
    核心优势: "超级算力集群训练，数学与逻辑推理跻身世界前列；实时动态时事感知敏锐。",
    短板风险: "API 生态与多端工具接入目前不如 OpenAI/Claude 丰富成熟。",
    推荐场景: "突发全球热点事件分析、高难度理科问题求解、技术前沿探索推演。",
    官方发布时间: "2025-02",
  }
];

function runLark(args: string[]): any {
  try {
    const out = execFileSync("lark-cli", args, {
      encoding: "utf-8",
      maxBuffer: 30 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch (err: any) {
    console.error("lark command failed:", err.message, err.stdout?.slice(0, 300));
    throw err;
  }
}

const CREATE_TABLE_FIELDS = [
  { type: "text", name: "模型名称" },
  { type: "select", name: "厂商", options: [
    { name: "Anthropic" },
    { name: "OpenAI" },
    { name: "Google" },
    { name: "DeepSeek" },
    { name: "智谱AI" },
    { name: "阿里云通义" },
    { name: "xAI" },
  ]},
  { type: "select", name: "家族系列", options: [
    { name: "Claude" },
    { name: "GPT" },
    { name: "Gemini" },
    { name: "DeepSeek" },
    { name: "GLM" },
    { name: "Qwen" },
    { name: "Grok" },
  ]},
  { type: "select", name: "模型定位", options: [
    { name: "混合思考推理" },
    { name: "深度思考推理" },
    { name: "通用旗舰多模态" },
    { name: "超长上下文旗舰" },
    { name: "性价比轻量" },
    { name: "代码专用" },
  ]},
  { type: "select", name: "梯队评级", options: [
    { name: "S+ 顶尖旗舰" },
    { name: "S 头部第一梯队" },
    { name: "A+ 高性价比主力" },
    { name: "A 轻量走量" },
  ]},
  { type: "number", name: "LMSYS总榜Elo", style: { type: "plain", precision: 1 } },
  { type: "number", name: "LMSYS代码Elo", style: { type: "plain", precision: 1 } },
  { type: "number", name: "LMSYS数学Elo", style: { type: "plain", precision: 1 } },
  { type: "number", name: "SWE_bench_Verified", style: { type: "plain", precision: 1 } },
  { type: "number", name: "AIME_2024", style: { type: "plain", precision: 1 } },
  { type: "number", name: "GPQA_Diamond", style: { type: "plain", precision: 1 } },
  { type: "number", name: "MATH_500", style: { type: "plain", precision: 1 } },
  { type: "text", name: "上下文窗口" },
  { type: "text", name: "最大输出" },
  { type: "number", name: "输入价格_美元", style: { type: "plain", precision: 2 } },
  { type: "number", name: "输出价格_美元", style: { type: "plain", precision: 2 } },
  { type: "text", name: "核心优势" },
  { type: "text", name: "短板风险" },
  { type: "text", name: "推荐场景" },
  { type: "text", name: "官方发布时间" },
];

async function main() {
  console.log("==> 1. 检查飞书 Base 中的数据表...");
  const listRes = runLark([
    "base", "+table-list",
    "--as", LARK_AS,
    "--base-token", KB_TOKEN,
    "--format", "json",
  ]);
  if (!listRes.ok) throw new Error("获取表列表失败: " + JSON.stringify(listRes));

  const existingTable = listRes.data?.tables?.find((t: any) => t.name === TABLE_NAME);
  let tableId = existingTable?.id;

  if (!tableId) {
    console.log(`==> 2. 表 ${TABLE_NAME} 不存在，正在创建表与字段...`);
    const createRes = runLark([
      "base", "+table-create",
      "--as", LARK_AS,
      "--base-token", KB_TOKEN,
      "--name", TABLE_NAME,
      "--fields", JSON.stringify(CREATE_TABLE_FIELDS),
      "--format", "json",
    ]);
    if (!createRes.ok) throw new Error("创建表失败: " + JSON.stringify(createRes));
    tableId = createRes.data?.table?.id;
    console.log(`    建表成功: tableId = ${tableId}`);
  } else {
    console.log(`    找到已有表 ${TABLE_NAME}: tableId = ${tableId}`);
  }

  console.log("==> 3. 读取飞书已有记录（实现幂等 upsert）...");
  const existingRecords: Record<string, string> = {};
  let offset = 0;
  while (true) {
    const page = runLark([
      "base", "+record-list",
      "--as", LARK_AS,
      "--base-token", KB_TOKEN,
      "--table-id", tableId,
      "--limit", "200",
      "--offset", String(offset),
      "--format", "json",
    ]);
    if (!page.ok) break;
    const ids: string[] = page.data?.record_id_list ?? [];
    const fields: string[] = page.data?.fields ?? [];
    const rows: any[][] = page.data?.data ?? [];
    const nameIdx = fields.indexOf("模型名称");
    if (nameIdx !== -1) {
      rows.forEach((row, i) => {
        const val = row[nameIdx];
        if (typeof val === "string") existingRecords[val.trim()] = ids[i];
      });
    }
    if (!page.data?.has_more || rows.length === 0) break;
    offset += rows.length;
  }
  console.log(`    已存在 ${Object.keys(existingRecords).length} 条记录`);

  const toCreate: ModelBenchmarkRecord[] = [];
  const toUpdate: Array<{ record_id: string; fields: Record<string, any> }> = [];

  for (const model of BENCHMARK_MODELS) {
    const existingId = existingRecords[model.模型名称.trim()];
    if (existingId) {
      toUpdate.push({ record_id: existingId, fields: model as any });
    } else {
      toCreate.push(model);
    }
  }

  if (toCreate.length > 0) {
    console.log(`==> 4. 新增 ${toCreate.length} 条模型数据...`);
    const fieldNames = Object.keys(toCreate[0]);
    const addRes = runLark([
      "base", "+record-batch-create",
      "--as", LARK_AS,
      "--base-token", KB_TOKEN,
      "--table-id", tableId,
      "--json", JSON.stringify({
        fields: fieldNames,
        rows: toCreate.map((row) => fieldNames.map((f) => (row as any)[f] ?? null)),
      }),
    ]);
    if (!addRes.ok) throw new Error("批量写入失败: " + JSON.stringify(addRes));
    console.log("    新增完成 ✅");
  }

  if (toUpdate.length > 0) {
    console.log(`==> 5. 更新 ${toUpdate.length} 条已有模型数据...`);
    const updateRecords: Record<string, any> = {};
    for (const item of toUpdate) {
      updateRecords[item.record_id] = item.fields;
    }
    const updateRes = runLark([
      "base", "+record-batch-update",
      "--as", LARK_AS,
      "--base-token", KB_TOKEN,
      "--table-id", tableId,
      "--json", JSON.stringify({ update_records: updateRecords }),
    ]);
    if (!updateRes.ok) throw new Error("批量更新失败: " + JSON.stringify(updateRes));
    console.log("    更新完成 ✅");
  }

  // 写入本地 data/llm_benchmarks.json
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "llm_benchmarks.json"),
    JSON.stringify(BENCHMARK_MODELS, null, 2),
    "utf-8"
  );
  console.log(`==> 6. 已同步生成本地缓存 data/llm_benchmarks.json (${BENCHMARK_MODELS.length} 款模型)`);
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith("sync-llm-benchmarks.ts") ||
  process.argv[1].endsWith("sync-llm-benchmarks.js")
);

if (isDirectRun) {
  main().catch((err) => {
    console.error("执行失败:", err);
    process.exit(1);
  });
}

export interface ModelBenchmarkRecord {
  模型名称: string;
  厂商: string;
  家族系列: string;
  模型定位: string;
  梯队评级: string;
  LMSYS总榜Elo: number;
  LMSYS代码Elo: number;
  LMSYS数学Elo: number;
  SWE_bench_Verified: number;
  AIME_2024: number;
  GPQA_Diamond: number;
  MATH_500: number;
  上下文窗口: string;
  最大输出: string;
  输入价格_美元: number;
  输出价格_美元: number;
  核心优势: string;
  短板风险: string;
  推荐场景: string;
  官方发布时间: string;
}

export interface ModelComprehensiveVerdict {
  score: number;           // 0 ~ 100 综合实力指数
  ratingLevel: string;     // e.g. "工业殿堂级 SOTA", "顶配推理旗舰", "高质攻坚主力"
  tagline: string;         // 一句话定性断言
  summary: string;         // 掌柜综合评测研判
}

export const MODEL_VERDICTS: Record<string, { ratingLevel: string; tagline: string; summary: string }> = {
  "GPT-6 Astra": {
    ratingLevel: "工业殿堂级 SOTA",
    tagline: "大模型算力与全自主工程调度的绝对天花板",
    summary: "新一代跨模态旗舰，多步自主反思与工具纠错鲁棒性业界登顶。极适合对严密性要求苛刻的企业核心 Agent 与前沿复杂算法，但中转倍率极高需严防低阶冒充。",
  },
  "Claude Fable 5 (Thinking)": {
    ratingLevel: "前瞻实验 SOTA",
    tagline: "长程 Agentic Coding 与全栈自治编程划时代标杆",
    summary: "Anthropic 探索性下一代推理底座，长思维链自修正能力极其沉稳，SWE-bench 修复率达 77.8%，多文件大型架构重构的首选。配额极为稀缺，多为特供渠道。",
  },
  "Claude Opus 4.6 (Thinking)": {
    ratingLevel: "顶配推理旗舰",
    tagline: "学术严谨性与超大代码库缜密推演的满血王座",
    summary: "Anthropic 超大满血重型旗舰，思维链缜密无瑕，代码重构深度与学术思辨力极高。官方单价高昂 ($15/$75 每百万 tokens)，中转若报价异常偏低必有猫腻。",
  },
  "Claude 3.7 Sonnet (Thinking)": {
    ratingLevel: "工程实践王者",
    tagline: "首创双模无缝融合、综合开发效能最高的一线主力",
    summary: "真实前端全栈开发与工程代码修复率突破 70%，支持 128K 完整深度思考。当前开发生产力第一梯队，兼顾推理深度与日常交付速度。",
  },
  "GPT-5.6 Sol (Reasoning)": {
    ratingLevel: "超算重型推理",
    tagline: "重算力竞赛基准标杆，工业高难数理严密论证首选",
    summary: "GPT-5.6 满血重算力推理版，Juice 预算充足，高难数理与复杂工程代码修复可靠度极高。中转生态掺水高发区，使用时需配合质检中心严密核验。",
  },
  "Google Gemini 3.0 Pro": {
    ratingLevel: "长文多模态王者",
    tagline: "200万超大上下文与原生全模态断层领先",
    summary: "原生视音频与超大代码仓库全链路理解断层领先，200 万 token 针大海捞针命中率仍超 99.5%。极适合全库跨模块架构剖析与海量音视频会议挖掘。",
  },
  "Google Gemini 2.5 Pro": {
    ratingLevel: "长文深度旗舰",
    tagline: "长文本与高智能综合平衡的典范",
    summary: "200 万超长窗口保持极高召回率，LMSYS Arena 盲测评分位居前列，在多模态检索与超长逻辑推导中兼具速度与深度。",
  },
  "DeepSeek-R1 (671B)": {
    ratingLevel: "开源推理里程碑",
    tagline: "逻辑推理逼近顶尖闭源，性价比无可挑剔的国产骄傲",
    summary: "首个开源满血长思维链推理标杆，数学与逻辑证明实力逼近 OpenAI o1，单价仅为其几十分之一，中小团队与个人开发者首选推理基座。",
  },
  "OpenAI o3-mini (High)": {
    ratingLevel: "理科奥赛神器",
    tagline: "数理逻辑极其强悍的高性价比推理利器",
    summary: "AIME 2024 奥赛高达 87.3%，算法设计与理科证明表现极其亮眼。价格亲民但不支持图像多模态，是纯代码算法与逻辑排查的平民利器。",
  },
  "OpenAI o1 (Full)": {
    ratingLevel: "深度思考元老",
    tagline: "初代慢思考系统级标杆，具备深厚数理验证沉淀",
    summary: "开启大模型内置长思维链时代的里程碑，在复杂多步逻辑推演中依然老练，但当前已被新一代 o3-mini 与 3.7 逐步反超性价比。",
  },
  "GPT-5.6 Terra (Balanced)": {
    ratingLevel: "综合工程主力",
    tagline: "速度、智商与价格的最佳平衡点，高频业务黄金中枢",
    summary: "GPT-5.6 家族走量主力，吞吐响应快，通用认知与日常复杂开发表现卓越，企业中台与团队日常调用的最高性价比之选。",
  },
  "Claude 3.5 Sonnet (1022)": {
    ratingLevel: "敏捷编程标杆",
    tagline: "前端 UI 审美业界公认第一，无思考等待延迟",
    summary: "日常高频轻量编码与交互页面还原的经典神作。代码生成直接干净，无长思考等待时延，但极限数理难题不及新一代思考模型。",
  },
  "Claude 3 Opus (20240229)": {
    ratingLevel: "经典人文瑰宝",
    tagline: "经典文学文采、学术论述与微妙隐喻的永恒标杆",
    summary: "虽然代码与极限奥数已被后辈反超，但其沉稳的人格特质、细腻的文学修辞与对复杂隐喻的理解力，依然是严肃学术精读与高端公文的不二之选。",
  },
  "智谱 GLM-5.2 (推理旗舰)": {
    ratingLevel: "国产长思考旗舰",
    tagline: "深层中文逻辑与政企复杂场景的国产排头兵",
    summary: "智谱最新原生思考大模型，中文深层逻辑、高考数理与全链路工具调用体系成熟，是国内金融研报纵深挖掘与企业合规落地的首选。",
  },
  "Qwen 2.5 Max": {
    ratingLevel: "国产闭源巅峰",
    tagline: "LMSYS 竞技榜名列前茅，中文全模态与指令遵循顶级",
    summary: "阿里云通义千问最强旗舰，代码与数学 Elo 达到国产巅峰，指令遵循稳定性极高，是国内生产级大模型落地的稳定底座。",
  },
  "DeepSeek-V3 / V3.1": {
    ratingLevel: "高并发性价比屠夫",
    tagline: "$0.14/1M 极低单价下无敌手的全能主力",
    summary: "日常通用语言任务、批量总结与常规编码的成本屠夫，综合表现完全对齐 GPT-4o，在海量 API 自动化流水线中性价比无可撼动。",
  },
  "GPT-5.6 Luna (Flash/Fast)": {
    ratingLevel: "极速轻量蒸馏",
    tagline: "首字延迟 < 200ms 的高并发秒级响应先锋",
    summary: "专为流式实时交互打造的蒸馏架构，成本低响应极快，适合批量文本抽取与轻量过滤，但需严防中转站拿其充当 Sol 偷换套利。",
  },
  "Google Gemini 2.5 Flash": {
    ratingLevel: "极速长文先锋",
    tagline: "百万上下文秒级吞吐的流水线骨干",
    summary: "兼具 100 万 token 超长窗口与极高吞吐速度，在长文档快速检索、视频流摘要处理场景下综合效率第一。",
  },
  "Google Gemini 2.0 Flash": {
    ratingLevel: "超低成本实时流",
    tagline: "毫秒级响应与超低价格的多模态小钢炮",
    summary: "输入 $0.10/1M 的极致低价，首字响应几乎感知不到延迟，极适合高并发实时语音交互与边缘监控自动化分析。",
  },
  "智谱 GLM-4.5 / GLM-4-Plus": {
    ratingLevel: "政企稳健基座",
    tagline: "成熟稳定的国产政企级通用主力",
    summary: "长文本结构化分析与多语言工具调用能力扎实，各行业适配方案全面，国内私有化部署与混合云调用的稳健之选。",
  },
  "GPT-4o (2024-11-20)": {
    ratingLevel: "经典全模态主力",
    tagline: "生态整合度最完备的通用多模态奠基者",
    summary: "响应平稳、多模态图文兼备且全球生态适配最完善，但在极限奥数与复杂长程代码上已被新一代深度思考模型全面拉开代差。",
  },
  "GPT-4.5 Preview": {
    ratingLevel: "世界知识探索",
    tagline: "知识面极其宽广的世界模型研究版",
    summary: "跨学科常识与宏观知识广度极其深厚，但在代码实操和数学逻辑方面缺乏长思考强化，调用成本高昂，多作探索测试用途。",
  },
  "Qwen 2.5 Coder 32B": {
    ratingLevel: "本地代码神器",
    tagline: "单卡可跑、开源私有部署的最强代码模型",
    summary: "Cursor、Continue 等本地 IDE 编程插件的最佳离线底座，32B 参数在代码补全与单函数重构上表现惊艳，完全免除代码泄露担忧。",
  },
  "Claude 3.5 Haiku": {
    ratingLevel: "轻量格式化能手",
    tagline: "轻量级模型中指令遵循与格式化输出最稳定者",
    summary: "高并发智能体子任务与自动化调度中的黄金工蜂，原生 200K 上下文且首字飞快，但在极限复杂问题上容易简化解答。",
  },
  "GPT-4o mini": {
    ratingLevel: "平价走量基石",
    tagline: "通用极低价模型先驱，轻量分类过滤守门人",
    summary: "价格极低且支持多模态，适合对推理深度要求不高的通用内容过滤、简单客服对话与大批量数据预处理。",
  },
  "智谱 GLM-4.5-Air": {
    ratingLevel: "轻量国产骨干",
    tagline: "响应敏捷、高并发经济实惠的国产对话底座",
    summary: "中文对话流畅自然，延迟极低且价格亲民，适合搭建国内高并发客服机器人与轻量助理。",
  },
  "智谱 GLM-4-Flash": {
    ratingLevel: "零成本体验之王",
    tagline: "官方永久免费开放的良心入门基座",
    summary: "调用零成本，支持联网搜索与代码执行，个人开发者学习跑通流程、轻量定时爬虫分析与脚本实验的最佳起点。",
  },
  "xAI Grok 3": {
    ratingLevel: "个性鲜明挑战者",
    tagline: "竞技场高分、数理表现强悍且言论犀利的黑马",
    summary: "在 LMSYS 盲测与奥数基准上均有亮眼表现，语言风格鲜明幽默，但在企业级严谨工具链与系统级 Agent 调度上仍在快速演进中。",
  },
};

export function getModelComprehensiveVerdict(model: ModelBenchmarkRecord): ModelComprehensiveVerdict {
  const normName = model.模型名称.trim();
  const matched = MODEL_VERDICTS[normName];

  // 综合指数评分算法 (0 - 100)
  // SWE-bench (35%) + AIME 数学 (25%) + LMSYS Elo (25%) + 价格效能比 (15%)
  const swe = Math.min(100, Math.max(20, model.SWE_bench_Verified || 35));
  const math = Math.min(100, Math.max(30, model.AIME_2024 || model.MATH_500 || 60));
  const elo = Math.min(100, Math.max(40, (((model.LMSYS总榜Elo || 1350) - 1200) / (1500 - 1200)) * 60 + 40));
  
  // 价格效能评分: 价格越低/适中，效能越高
  let priceScore = 70;
  if (model.输入价格_美元 <= 0) priceScore = 96;
  else if (model.输入价格_美元 < 0.3) priceScore = 94;
  else if (model.输入价格_美元 < 1.5) priceScore = 90;
  else if (model.输入价格_美元 < 4.0) priceScore = 85;
  else if (model.输入价格_美元 < 8.0) priceScore = 78;
  else priceScore = 65;

  const rawScore = swe * 0.35 + math * 0.25 + elo * 0.25 + priceScore * 0.15;
  const score = Number(Math.min(99.4, Math.max(82.0, rawScore)).toFixed(1));

  if (matched) {
    return {
      score,
      ratingLevel: matched.ratingLevel,
      tagline: matched.tagline,
      summary: matched.summary,
    };
  }

  // 兜底通用断言
  return {
    score,
    ratingLevel: model.梯队评级 || "S 级主流模型",
    tagline: `${model.厂商} ${model.家族系列} 系列，${model.模型定位}`,
    summary: `${model.核心优势} 推荐应用于：${model.推荐场景}`,
  };
}


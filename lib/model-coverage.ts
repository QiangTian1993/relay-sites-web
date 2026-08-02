// 模型覆盖摘要 —— 详情页 02 段卡片（PRD F.04 简化版）
// 输入：modelOffers 列表 → 输出：{ total, lowestRate, providers[], textCount, imageCount }

import type { ModelOfferSummary } from "./relay-product";

export interface ModelCoverage {
  total: number;
  lowestRate: number | null;
  /** 覆盖的厂商（去重，按字母排序） */
  providers: string[];
  textCount: number;
  imageCount: number;
}

const PROVIDER_HINTS: Array<{ pattern: RegExp; provider: string }> = [
  { pattern: /\b(gpt-|o[1-4]\b|text-|dall-e|openai)/i, provider: "OpenAI" },
  { pattern: /claude/i, provider: "Claude" },
  { pattern: /gemini/i, provider: "Gemini" },
  { pattern: /(grok|^xai|x-)/i, provider: "xAI" },
  { pattern: /deepseek/i, provider: "DeepSeek" },
  { pattern: /qwen/i, provider: "Qwen" },
  { pattern: /(glm|chatglm)/i, provider: "GLM" },
  { pattern: /kimi/i, provider: "Kimi" },
  { pattern: /doubao/i, provider: "Doubao" },
  { pattern: /(hunyuan|混元)/i, provider: "Hunyuan" },
  { pattern: /(llama|meta-)/i, provider: "Meta" },
  { pattern: /mistral/i, provider: "Mistral" },
];

/** 从模型名推断厂商（unknown model 名 → null） */
export function inferProviderFromModelName(name: string): string | null {
  for (const { pattern, provider } of PROVIDER_HINTS) {
    if (pattern.test(name)) return provider;
  }
  return null;
}

export function computeModelCoverage(offers: ModelOfferSummary[]): ModelCoverage {
  const providers = new Set<string>();
  let lowestRate: number | null = null;
  let textCount = 0;
  let imageCount = 0;
  for (const o of offers) {
    if (o.type === "text") textCount++;
    else if (o.type === "image") imageCount++;
    const r = o.type === "image" ? o.perCallPrice : (o.inputRate ?? null);
    if (r != null && Number.isFinite(r)) {
      if (lowestRate == null || r < lowestRate) lowestRate = r;
    }
    const p = inferProviderFromModelName(o.name);
    if (p) providers.add(p);
  }
  return {
    total: offers.length,
    lowestRate,
    providers: [...providers].sort(),
    textCount,
    imageCount,
  };
}
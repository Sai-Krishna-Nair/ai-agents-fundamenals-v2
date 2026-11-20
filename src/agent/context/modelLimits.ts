import type { ModelLimits } from "../../types.ts";

/**
 * Default threshold for context window usage (80%)
 */
export const DEFAULT_THRESHOLD = 0.8;

/**
 * Model limits registry
 * uses the OG Groq limits on gpt-oss-20b/120b
 */
// const MODEL_LIMITS: Record<string, ModelLimits> = {
//   "openai/gpt-oss-20b": {
//     inputLimit: 131072,
//     outputLimit: 65536,
//     contextWindow: 131072,
//   },
//   "openai/gpt-oss-120b": {
//     inputLimit: 131072,
//     outputLimit: 65536,
//     contextWindow: 131072,
//   },
// };

// /**
//  * Default limits used when model is not found in registry
//  */
// const DEFAULT_LIMITS: ModelLimits = {
//   inputLimit: 131072,
//   outputLimit: 65536,
//   contextWindow: 131072,
// };


// enforces groq's free tier api limit which is 8k tokens
const MODEL_LIMITS: Record<string, ModelLimits> = {
  "openai/gpt-oss-20b": {
    inputLimit: 6000,
    outputLimit: 2000,
    contextWindow: 8000,
  },
  "openai/gpt-oss-120b": {
    inputLimit: 6000,
    outputLimit: 2000,
    contextWindow: 8000,
  },
};

/**
 * Default limits used when model is not found in registry
 */
const DEFAULT_LIMITS: ModelLimits = {
  inputLimit: 6000,
  outputLimit: 2000,
  contextWindow: 8000,
};




/**
 * Get token limits for a specific model.
 * Falls back to default limits if model not found.
 * Matches GPT-5 variants (gpt-5, gpt-5-mini, etc.)
 */
export function getModelLimits(model: string): ModelLimits {
  // Direct match
  if (MODEL_LIMITS[model]) {
    return MODEL_LIMITS[model];
  }

  // Match variants without the "openai/" prefix
  if (model.includes("gpt-oss-120b")) {
    return MODEL_LIMITS["openai/gpt-oss-120b"];
  }
  if (model.includes("gpt-oss-20b")) {
    return MODEL_LIMITS["openai/gpt-oss-20b"];
  }

  return DEFAULT_LIMITS;
}

/**
 * Check if token usage exceeds the threshold
 */
export function isOverThreshold(
  totalTokens: number,
  contextWindow: number,
  threshold: number = DEFAULT_THRESHOLD,
): boolean {
  return totalTokens>=contextWindow*threshold;
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(
  totalTokens: number,
  contextWindow: number,
): number {
  return (totalTokens/contextWindow)*100;
}

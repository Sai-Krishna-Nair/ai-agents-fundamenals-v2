import 'dotenv/config';
import { generateText, type ModelMessage, registerTelemetry } from "ai";
import { groq } from "@ai-sdk/groq";
import { observe, Laminar, LaminarAiSdkTelemetry } from "@lmnr-ai/lmnr";

import { tools } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import type { AgentCallbacks } from "../types.ts";

const MODEL_NAME = "openai/gpt-oss-20b";

// 1. Register Laminar telemetry (once, early)
registerTelemetry(new LaminarAiSdkTelemetry({
  laminarOptions: {
    projectApiKey: process.env.LMNR_PROJECT_API_KEY,
  },
}));

// Optional if you also want Laminar.initialize for other instrumentation
Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<any> {
  // 2. Wrap the whole agent run in observe
  const result = await observe(
    { name: "runAgent", sessionId: undefined /* add if you have one */ },
    async () => {
      const { text } = await generateText({
        model: groq(MODEL_NAME),
        prompt: userMessage,
        system: SYSTEM_PROMPT,
        tools,
        // telemetry is handled by the registered LaminarAiSdkTelemetry
        // you can still pass functionId if you want a custom span name:
        // telemetry: { functionId: "agent-generate" },
      });

      return text;
    },
  );

  await Laminar.flush(); 
  // important for short-lived scripts
  console.log(result);
  console.log("done");
  return result;
}
import { generateText, stepCountIs, tool, type ModelMessage, type ToolSet } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { SYSTEM_PROMPT } from "../src/agent/system/prompt.ts";

import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";

import { buildMessages, buildMockedTools } from "./utils.ts";


const TOOL_DEFINITONS = {
  readFile: {
    description: "Read the contents of a file at a specified path",
    parameters: z.object({
      path : z.string().describe("the path to the file you want to read")
    }),
  },
  writeFile: {
    description: "Write the given content to a file at the given path",
    parameters: z.object({
      path : z.string().describe("the path to the file you want to Write to") ,
      content : z.string().describe("the content you have to write")
    }),
  },
  listFiles: {
    description: "List all the files in a directory",
    parameters: z.object({
      path : z.string().describe("the path to the direcory whose files you want to list")
    }),
  },
  deleteFile: {
    description: "Delete a file at the specified path",
    parameters: z.object({
      path : z.string().describe("the path to the file you want to delete")
    }),
  },
  runCommand: {
    description: "Execute a shell command and return its output",
    parameters: z.object({
      command : z.string().describe("the shell command to execute")
    }),
  },

}


export type ToolName = keyof typeof TOOL_DEFINITONS;

export const singleTurnExecutorWithMocks = async (data: EvalData) => {
  const allMessages = buildMessages(data);

  const systemMessage = allMessages.find((m) => m.role === "system");
  const messages = allMessages.filter((m) => m.role !== "system");

  const instructions =
    typeof systemMessage?.content === "string" ? systemMessage.content : undefined;

  const tools: ToolSet = {};
  for (const name of data.tools) {
    const def = TOOL_DEFINITONS[name as ToolName];
    if (def) {
      tools[name] = tool({
        description: def.description,
        inputSchema: def.parameters as any,
      });
    }
  }

  const { toolCalls } = await generateText({
    model: groq(data.config?.model ?? "openai/gpt-oss-20b"),
    instructions,           // ← system prompt goes here
    messages,               // ← only user (and later assistant) messages
    tools,
    stopWhen: stepCountIs(1),
    temperature: data.config?.temperature ?? undefined,
  });

  const calls = toolCalls.map((tc) => ({
    toolname: tc.toolName,
    args: "args" in tc ? tc.args : {},
  }));

  const toolNames = toolCalls.map((tc) => tc.toolName);

  return {
    calls,
    toolNames,
    selectedAny: toolNames.length > 0,
  };
};

/**
 * Multi-turn executor with mocked tools.
 * Runs a complete agent loop with tools returning fixed values.
 */

export async function multiTurnExecutorWithMocks (data:MultiTurnEvalData) : Promise<MultiTurnResult> {
  const tools = buildMockedTools(data.mockTools);
  const messages : ModelMessage[] = data.messages ?? [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: data.prompt! },
  ];
  const result = await generateText({
    model: groq(data.config?.model ?? "openai/gpt-oss-20b"),
    messages,
    tools,
    stopWhen: stepCountIs(data.config?.maxSteps ?? 20),
  });

  // Extract all tool calls in order from steps
  const allToolCalls: string[] = [];
  const steps = result.steps.map((step) => {
    const stepToolCalls = (step.toolCalls ?? []).map((tc) => {
      allToolCalls.push(tc.toolName);
      return {
        toolName: tc.toolName,
        args: "args" in tc ? tc.args : {},
      };
    });

    const stepToolResults = (step.toolResults ?? []).map((tr) => ({
      toolName: tr.toolName,
      result: "result" in tr ? tr.result : tr,
    }));

    return {
      toolCalls: stepToolCalls.length > 0 ? stepToolCalls : undefined,
      toolResults: stepToolResults.length > 0 ? stepToolResults : undefined,
      text: step.text || undefined,
    };
  });

  // Extract unique tools used
  const toolsUsed = [...new Set(allToolCalls)];

  return {
    text: result.text,
    steps,
    toolsUsed,
    toolCallOrder: allToolCalls,
  };
}


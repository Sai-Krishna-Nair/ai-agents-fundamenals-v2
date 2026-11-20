import {streamText, type ModelMessage, registerTelemetry} from "ai";
import { groq } from "@ai-sdk/groq";
import { observe, LaminarAiSdkTelemetry } from "@lmnr-ai/lmnr";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTool.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";
import {
  estimateMessagesTokens,
  getModelLimits,
  isOverThreshold,
  calculateUsagePercentage,
  compactConversation,
  DEFAULT_THRESHOLD,
} from "./context/index.ts";

  



registerTelemetry(
  new LaminarAiSdkTelemetry({
    laminarOptions: { projectApiKey: process.env.LMNR_API_KEY },
  }),
);

const MODEL_NAME = "openai/gpt-oss-20b";

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<ModelMessage[]> {

  return await observe({ name: "runAgent" }, async () => {
      const modelLimits = getModelLimits(MODEL_NAME);

      let workingHistory = filterCompatibleMessages(conversationHistory);

      let messages : ModelMessage[] = [  
      ...workingHistory,
      {
        role: "user",
        content: userMessage 
      }
    ];

    const preCheckTokens = estimateMessagesTokens(messages);
    if (isOverThreshold(preCheckTokens.total, modelLimits.contextWindow)) {
        // Compact the conversation
        messages = await compactConversation(messages, MODEL_NAME);
      }
 

    let fullResponse = "";



    
    while(true){
      const result = streamText({
        model:groq(MODEL_NAME),
        instructions: SYSTEM_PROMPT,
        messages,
        tools,
      })
    

      const reportTokenUsage = () => {
      if (callbacks.onTokenUsage) {
            const usage = estimateMessagesTokens(messages);
            callbacks.onTokenUsage({
              inputTokens: usage.input,
              outputTokens: usage.output,
              totalTokens: usage.total,
              contextWindow: modelLimits.contextWindow,
              threshold: DEFAULT_THRESHOLD,
              percentage: calculateUsagePercentage(
                usage.total,
                modelLimits.contextWindow,
              ),
            });
          }
        };


      const toolCalls:ToolCallInfo[] = [];
      let currentText = "";
      let streamError:Error | null = null;

      try{

        for await (const chunk of result.stream){

          if (chunk.type === "error") {
            streamError =
              chunk.error instanceof Error
                ? chunk.error
                : new Error(String(chunk.error));
            console.error("Stream error:", streamError);
            break;
          }


          if(chunk.type === 'text-delta'){
            currentText+=chunk.text;
            callbacks.onToken(chunk.text);
          }

          if(chunk.type === 'tool-call'){
            const input = 'input' in chunk? chunk.input : {};
            toolCalls.push({
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              args: input as any,
            })
            callbacks.onToolCallStart(chunk.toolName,input);
          }
        }

      } catch (e){
        streamError =  e as Error;
        if ( !currentText && !streamError.message.includes("No output generated")) {
          throw streamError;
        }
      }
      
      fullResponse+=currentText;
      if(streamError && !currentText){
        fullResponse = "I apologize, but I wasn't able to generate a response. Could you please try rephrasing your message?";
        callbacks.onToken(fullResponse);
        break;
      }

      const finishReason  = await result.finishReason;
      if(finishReason!=='tool-calls' || finishReason.length == 0){
        const response = (await result.finalStep).response;
        messages.push(...response.messages);
        reportTokenUsage();
        break;
      }

      const response = (await result.finalStep).response;
      messages.push(...response.messages);
      reportTokenUsage();

      for (const tc of toolCalls) {
      const result = await executeTool(tc.toolName, tc.args);
      callbacks.onToolCallEnd(tc.toolName, result);

      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            output: { type: "text", value: result },
          },
        ],
      });
      reportTokenUsage();
    }
  }
  callbacks.onComplete(fullResponse);
  return messages;
  });


}

import {streamText, type ModelMessage, registerTelemetry} from "ai";
import { groq } from "@ai-sdk/groq";
import { observe, LaminarAiSdkTelemetry } from "@lmnr-ai/lmnr";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTool.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";



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
      const workingHistory = filterCompatibleMessages(conversationHistory);


      const messages : ModelMessage[] = [  
      ...workingHistory,
      {
        role: "user",
        content: userMessage
      }
    ];

    let fullResponse = "";
    
    while(true){
      const result = streamText({
        model:groq(MODEL_NAME),
        instructions: SYSTEM_PROMPT,
        messages,
        tools,
      })

      const toolCalls:ToolCallInfo[] = [];
      let currentText = "";
      let streamError:Error | null = null;

      try{

        for await (const chunk of result.stream){
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
        break;
      }

      const response = (await result.finalStep).response;
      messages.push(...response.messages);

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
    }

  }
  callbacks.onComplete(fullResponse);
  return messages;
  });


}

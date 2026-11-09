import 'dotenv/config';
import {generateText, type ModelMessage} from "ai"
import {groq} from '@ai-sdk/groq'
import {SYSTEM_PROMPT} from './system/prompt.ts'
import type {AgentCallbacks} from '../types.ts'
const MODEL_NAME = 'openai/gpt-oss-20b'
import {tools} from './tools/index.ts'
import {executeTool} from './executeTools.ts'


export async function runAgent(
    userMessage: string,
    conversationHistory: ModelMessage[],
    callbacks: AgentCallbacks

): Promise<any>{
    const {text,toolCalls} = await generateText({
        model: groq(MODEL_NAME),
        prompt: userMessage,
        system: SYSTEM_PROMPT,
        tools,
    });
    console.log(text,toolCalls);

    toolCalls.forEach(async (ele) => {
        console.log(await executeTool(ele.toolName, ele.input ));
    });
}

runAgent("what is the current time right now?");
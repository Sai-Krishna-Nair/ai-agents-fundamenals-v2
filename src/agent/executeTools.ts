import { string } from 'zod';
import {tools} from './tools/index.ts'
type toolName = keyof typeof tools;

export async function executeTool(
    name: string,
    args: Record<string,unknown>,
): Promise<string>{
    const tool = tools[name as toolName]
    if(!tool){
        return  `Unknown tool: ${name}`;
    }

    const execute = tool.execute;

    if(!execute){
        return `Provider tool ${name} - executed by model provider`;
    }

    const result  = await execute(args,{
        toolCallId : "",
        messages : []
    } as any)

    return String(result);

}
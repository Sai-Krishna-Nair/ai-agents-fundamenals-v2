import {tool} from 'ai'
import {z} from 'zod'

export const dateTime = tool({
    description: "Returns the current time and date.Use this tool for any date and time related request",
    inputSchema: z.object({}),
    execute: ()=> {
        return new Date().toISOString()
    }
})


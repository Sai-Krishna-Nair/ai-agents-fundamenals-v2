import { groq } from "@ai-sdk/groq";
import {type Tool} from 'ai';

export const search:Tool= groq.tools.browserSearch({});


import { getDateTime } from "./dateTime.ts";
import {readFile,writeFile,listFiles,deleteFile} from './file.ts'
import {type ToolSet } from 'ai';

// All tools combined for the agent
export const tools : ToolSet = {
  getDateTime,
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};


export { readFile, writeFile, listFiles, deleteFile } from "./file.ts";


export const fileTools: ToolSet = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};




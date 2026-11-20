import { getDateTime } from "./dateTime.ts";
import {readFile,writeFile,listFiles,deleteFile} from './file.ts'
import { runCommand } from "./shell.ts";
import {search} from './web-search.ts'
import {type ToolSet } from 'ai';

// All tools combined for the agent
export const tools : ToolSet = {
  getDateTime,
  readFile,
  writeFile,
  listFiles,
  deleteFile,
  search,
  runCommand
};


export { readFile, writeFile, listFiles, deleteFile } from "./file.ts";


export const fileTools: ToolSet = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};

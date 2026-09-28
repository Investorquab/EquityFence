import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test("MCP exposes only read-only market tools",async()=>{
  const child=spawn("node",["--import","tsx","src/index.ts"],{
    cwd:new URL("..",import.meta.url).pathname,
    env:{...process.env,BINANCE_WEB3_API_KEY:"test-key",BINANCE_WEB3_SECRET_KEY:"test-secret"}
  });
  const messages:unknown[]=[];
  let buffer="";
  const done=new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill();reject(new Error("MCP protocol response timed out"));},3000);
    child.stdout.on("data",(chunk:Buffer)=>{
      buffer+=chunk.toString();
      let index=buffer.indexOf("\n");
      while(index>=0){
        const line=buffer.slice(0,index).trim(); buffer=buffer.slice(index+1); index=buffer.indexOf("\n");
        if(!line) continue;
        messages.push(JSON.parse(line));
        if(messages.length===2){clearTimeout(timer);resolve();child.kill();}
      }
    });
    child.on("error",reject);
  });
  child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:1,method:"initialize"})+"\n");
  child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:2,method:"tools/list"})+"\n");
  await done;
  const init=messages[0] as {result:{capabilities:{tools:unknown}}};
  const list=messages[1] as {result:{tools:Array<{name:string}>}};
  assert.deepEqual(init.result.capabilities.tools,{});
  assert.deepEqual(list.result.tools.map(tool=>tool.name),["handelo_market_lookup","handelo_market_search"]);
});


test("MCP source strictly validates ticker arguments", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");
  assert.match(source, /function readTicker\(args: unknown\)/);
  assert.match(source, /typeof ticker !== "string"/);
  assert.match(source, /ticker is too long/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createHandeloClient, normalizeChatMessage } from "./index.js";

test("SDK rejects empty chat messages",()=>{
  assert.throws(()=>normalizeChatMessage("   "),/message is required/);
  assert.equal(normalizeChatMessage("  What is NVDA?  "),"What is NVDA?");
});

test("SDK remote client reports non-JSON API failures clearly",async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response("not json",{status:503});
  try{
    await assert.rejects(
      ()=>createHandeloClient({baseUrl:"https://example.test"}).chat({message:"hello"}),
      /returned invalid JSON \(HTTP 503\)/
    );
  }finally{
    globalThis.fetch=original;
  }
});

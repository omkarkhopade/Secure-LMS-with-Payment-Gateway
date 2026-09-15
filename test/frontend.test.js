import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.js';

test('one server serves React routes and assets while preserving API boundaries', async () => {
 const directory=await mkdtemp(join(tmpdir(),'forma-frontend-'));
 await mkdir(join(directory,'assets'));
 await writeFile(join(directory,'index.html'),'<!doctype html><title>Forma</title><div id="root"></div>');
 await writeFile(join(directory,'assets','app-test.js'),'export const ready = true;');
 const server=createApp({clientDirectory:directory}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  for(const path of ['/', '/courses', '/course-detail/123','/signin']) {
   const response=await fetch(base+path);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/html/);assert.match(await response.text(),/id="root"/);assert.equal(response.headers.get('cache-control'),'no-cache');
   assert.match(response.headers.get('content-security-policy'),/checkout.razorpay.com/);
   if(process.env.NODE_ENV !== 'production') assert.doesNotMatch(response.headers.get('content-security-policy'),/upgrade-insecure-requests/);
  }
  const asset=await fetch(base+'/assets/app-test.js');assert.equal(asset.status,200);assert.match(asset.headers.get('cache-control'),/immutable/);
  for(const path of ['/api/missing','/api/v1/missing','/assets/missing.js','/.env','/package.json','/health/missing']) {
   const response=await fetch(base+path);assert.equal(response.status,404);assert.match(response.headers.get('content-type'),/application\/json/);
  }
  const post=await fetch(base+'/courses',{method:'POST'});assert.equal(post.status,404);
 } finally {await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});

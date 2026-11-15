import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable,Writable} from 'node:stream';
process.env.GOOGLE_CLIENT_ID='test-client';process.env.GOOGLE_CLIENT_SECRET='test-secret';
const {handler}=await import('../src/server.js');
async function request(url,headers={}){const req=Readable.from([]);req.url=url;req.method='GET';req.headers=headers;let body='';const res=new Writable({write(part,enc,done){body+=part;done()}});res.headers={};res.setHeader=(k,v)=>res.headers[k.toLowerCase()]=v;res.writeHead=(s,h={})=>{res.statusCode=s;Object.entries(h).forEach(([k,v])=>res.setHeader(k,v))};await handler(req,res);return{status:res.statusCode,headers:res.headers,body}}
test('OAuth binds state and PKCE to a cookie, rotates the session, and keeps tokens server-side',async()=>{
 const original=globalThis.fetch;
 const start=await request('/auth/google');assert.equal(start.status,303);
 const auth=new URL(start.headers.location);assert.equal(auth.hostname,'accounts.google.com');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.match(auth.searchParams.get('scope'),/drive.readonly/);
 const cookie=start.headers['set-cookie'].split(';')[0];assert.match(start.headers['set-cookie'],/HttpOnly; SameSite=Lax/);
 let exchanges=0;
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/token')){exchanges++;assert.ok(new URLSearchParams(options.body).get('code_verifier'));return Response.json({access_token:'private-test-token',refresh_token:'private-refresh',expires_in:3600,scope:'openid email https://www.googleapis.com/auth/drive.readonly'})}return Response.json({email:'owner@example.com',email_verified:true})};
 try{
  const rejected=await request('/auth/google/callback?code=test&state=wrong',{cookie});assert.equal(rejected.status,400);assert.equal(exchanges,0);
  const callback=`/auth/google/callback?code=test&state=${auth.searchParams.get('state')}`;
  const accepted=await request(callback,{cookie});assert.equal(accepted.status,303);const next=accepted.headers['set-cookie'].split(';')[0];assert.notEqual(next,cookie);assert.doesNotMatch(JSON.stringify(accepted),/private-test-token|private-refresh/);
  const status=await request('/api/drive/status',{cookie:next});assert.equal(JSON.parse(status.body).connected,true);assert.doesNotMatch(status.body,/private-test-token|private-refresh/);
  const replay=await request(callback,{cookie});assert.equal(replay.status,400);assert.equal(exchanges,1);
  const unindexed=await request('/api/drive/files/some_private_file/download',{cookie:next});assert.equal(unindexed.status,403);
 }finally{globalThis.fetch=original}
});

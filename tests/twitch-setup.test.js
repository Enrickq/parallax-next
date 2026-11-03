'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {Readable} = require('node:stream');
const {createTwitchSetup} = require('../twitch-setup');
const CLIENT='testclientpublicid123456789';
const IDENTITY={client_id:CLIENT,login:'testviewer',user_id:'12345',scopes:['chat:read'],expires_in:3600};
function make(options={}){
 let calls=0,accepted=null;
 const setup=createTwitchSetup({clientId:CLIENT,channel:'enriedit',onAuthorized:x=>{accepted=x},
   fetch:async(url,init)=>{calls++;assert.equal(url,'https://id.twitch.tv/oauth2/validate');assert.equal(init.redirect,'error');assert.match(init.headers.Authorization,/^OAuth /);return{ok:true,json:async()=>IDENTITY}},...options});
 return{setup,get calls(){return calls},get accepted(){return accepted}};
}
function dispatch(setup,{method='GET',url='/auth/twitch',headers={},remote='127.0.0.1',body}={}){
 return new Promise((resolve,reject)=>{
  const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
  Object.assign(req,{method,url,headers:{host:'localhost:3000',...headers},socket:{remoteAddress:remote}});
  const res={headersSent:false,writeHead(status,h){this.status=status;this.headers=h;this.headersSent=true},
   end(content=''){this.body=String(content);resolve({status:this.status,headers:this.headers,body:this.body})}};
  if(!setup.handle(req,res))reject(new Error('Route not handled'));
 });
}
async function begin(setup){
 const r=await dispatch(setup);
 assert.equal(r.status,302);
 const u=new URL(r.headers.Location);
 assert.equal(u.origin,'https://id.twitch.tv');assert.equal(u.pathname,'/oauth2/authorize');
 assert.equal(u.searchParams.get('scope'),'chat:read');assert.equal(u.searchParams.get('response_type'),'token');
 assert.equal(u.searchParams.get('redirect_uri'),'http://localhost:3000/auth/callback');
 const state=u.searchParams.get('state');
 assert.match(state,/^[a-f0-9]{64}$/);
 assert.match(r.headers['Set-Cookie'],/HttpOnly; SameSite=Lax/);
 return{state,cookie:r.headers['Set-Cookie'].split(';')[0]};
}
function completion(flow,extra={}){return{method:'POST',url:'/auth/complete',headers:{origin:'http://localhost:3000','content-type':'application/json',cookie:flow.cookie,...extra.headers},body:{token:'FAKE_TEST_TOKEN',state:flow.state,...extra.body},...Object.fromEntries(Object.entries(extra).filter(([key])=>!['headers','body'].includes(key)))}}
test('minimal OAuth flow validates identity and never returns its token',async()=>{
 const ctx=make();try{
  const flow=await begin(ctx.setup),r=await dispatch(ctx.setup,completion(flow));
  assert.equal(r.status,200);assert.deepEqual(JSON.parse(r.body),{ok:true});
  assert.equal(ctx.accepted.login,'testviewer');assert.equal(ctx.accepted.channel,'enriedit');assert.equal(ctx.calls,1);
  assert.ok(!r.body.includes('FAKE_TEST_TOKEN'));assert.match(r.headers['Set-Cookie'],/Max-Age=0/);
  assert.equal((await dispatch(ctx.setup,completion(flow))).status,403,'state must be single use');
 }finally{ctx.setup.close()}
});
test('state requires same browser cookie and exact local Origin',async()=>{
 const ctx=make();try{
  const flow=await begin(ctx.setup);
  assert.equal((await dispatch(ctx.setup,completion(flow,{headers:{cookie:'parallax_oauth_state='+'0'.repeat(64)}}))).status,403);
  assert.equal((await dispatch(ctx.setup,completion(flow,{headers:{origin:'https://attacker.example'}}))).status,403);
  assert.equal(ctx.calls,0);assert.equal(ctx.accepted,null);
 }finally{ctx.setup.close()}
});
test('rejects token for another client, missing read scope and app-only token',async()=>{
 for(const identity of [{...IDENTITY,client_id:'differentclient'}, {...IDENTITY,scopes:[]}, {...IDENTITY,login:null}]){
  const ctx=make({fetch:async()=>({ok:true,json:async()=>identity})});try{
   const flow=await begin(ctx.setup),r=await dispatch(ctx.setup,completion(flow));assert.equal(r.status,400);assert.equal(ctx.accepted,null);assert.ok(!r.body.includes('FAKE_TEST_TOKEN'));
  }finally{ctx.setup.close()}
 }
});
test('loopback, exact host and content type are enforced',async()=>{
 const ctx=make();try{
  assert.equal((await dispatch(ctx.setup,{remote:'203.0.113.1'})).status,403);
  assert.equal((await dispatch(ctx.setup,{headers:{host:'attacker.example:3000'}})).status,403);
  const flow=await begin(ctx.setup);
  assert.equal((await dispatch(ctx.setup,completion(flow,{headers:{'content-type':'text/plain'}}))).status,415);
  assert.equal((await dispatch(ctx.setup,completion(flow,{body:'x'.repeat(5000)}))).status,413);
  assert.equal(ctx.accepted,null);
 }finally{ctx.setup.close()}
});
test('callback is isolated, uncacheable and removes URL fragment before sending token',async()=>{
 const ctx=make();try{
  const r=await dispatch(ctx.setup,{url:'/auth/callback'});assert.equal(r.status,200);assert.equal(r.headers['Cache-Control'],'no-store');assert.equal(r.headers['Referrer-Policy'],'no-referrer');assert.match(r.headers['Content-Security-Policy'],/frame-ancestors 'none'/);
  assert.ok(r.body.indexOf('history.replaceState')<r.body.indexOf("fetch('/auth/complete'"));
  assert.ok(!r.body.includes('localStorage'));assert.ok(!r.body.includes('sessionStorage'));assert.ok(!r.body.includes('console.'));
 }finally{ctx.setup.close()}
});
test('unknown routes pass through and closed setup refuses OAuth',async()=>{
 const ctx=make();assert.equal(ctx.setup.handle({url:'/api/state'},{}),false);ctx.setup.close();
 assert.equal((await dispatch(ctx.setup)).status,503);
});

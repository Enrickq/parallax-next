'use strict';
/**
 * Loopback-only Twitch OAuth helper. Tokens exist only in process memory.
 *
 * Official contracts:
 * https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow
 * https://dev.twitch.tv/docs/authentication/validate-tokens/
 * https://dev.twitch.tv/docs/chat/irc/#authenticating-with-the-twitch-irc-server
 *
 * Register a Confidential Twitch application (Public applications support the
 * device flow only). Only its public client ID is used here; no client secret.
 */
const crypto = require('node:crypto');
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const COOKIE = 'parallax_oauth_state';
const MAX_BODY = 4096;

function createTwitchSetup(options = {}) {
  const clientId = String(options.clientId || '').trim();
  const redirect = new URL(options.redirectUri || 'http://localhost:3000/auth/callback');
  const channel = String(options.channel || '').toLowerCase().replace(/^#/, '');
  const fetchImpl = options.fetch || globalThis.fetch;
  const onAuthorized = options.onAuthorized || (() => {});
  const onInvalidated = options.onInvalidated || (() => {});
  if (redirect.protocol !== 'http:' || redirect.hostname !== 'localhost' || redirect.pathname !== '/auth/callback' || redirect.search || redirect.hash) {
    throw new Error('Twitch setup requires the registered http://localhost:<port>/auth/callback redirect.');
  }
  if (!/^[a-z0-9_]{1,25}$/.test(channel)) throw new Error('Configure a valid Twitch channel.');
  if (typeof fetchImpl !== 'function') throw new Error('Twitch setup requires fetch (Node 20+).');
  const pending = new Map();
  let active = null, validationTimer = null, closed = false;

  function baseHeaders() {
    return {'Cache-Control':'no-store', 'Pragma':'no-cache', 'Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY'};
  }
  function json(res, status, body, headers = {}) {
    res.writeHead(status, {...baseHeaders(), 'Content-Type':'application/json; charset=utf-8', ...headers});
    res.end(JSON.stringify(body));
  }
  function validRequest(req, checkOrigin = false) {
    if (!LOOPBACK.has(req.socket.remoteAddress || '')) return false;
    if (req.headers.host !== redirect.host) return false;
    if (checkOrigin && (req.headers.origin !== redirect.origin || req.headers['sec-fetch-site'] === 'cross-site')) return false;
    return true;
  }
  function cookieValue(req) {
    const part = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE+'='));
    return part ? part.slice(COOKIE.length+1) : '';
  }
  function same(a,b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length > 128) return false;
    return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
  }
  const clearCookie = COOKIE+'=; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=0';
  async function validate(token) {
    const response = await fetchImpl('https://id.twitch.tv/oauth2/validate', {
      method:'GET', headers:{Authorization:'OAuth '+token}, signal:AbortSignal.timeout(10000), redirect:'error'
    });
    if (!response.ok) throw new Error('Twitch token validation failed.');
    const identity = await response.json();
    if (identity.client_id !== clientId || !/^[a-z0-9_]{1,25}$/.test(identity.login || '') ||
      !identity.user_id || !Array.isArray(identity.scopes) || !identity.scopes.includes('chat:read') ||
      !Number.isFinite(identity.expires_in) || identity.expires_in <= 0) {
      throw new Error('Twitch token identity, client, scope or expiration did not match.');
    }
    return identity;
  }
  function scheduleValidation(identity) {
    clearTimeout(validationTimer);
    const delay = Math.min(3600000, Math.max(1000, (identity.expires_in-15)*1000));
    validationTimer = setTimeout(async () => {
      const session = active;
      if (!session || closed) return;
      try {
        const identity = await validate(session.token);
        if (active !== session || closed) return;
        if (identity.login !== session.login || identity.user_id !== session.userId) throw new Error('Identity changed.');
        scheduleValidation(identity);
      } catch {
        if (active !== session || closed) return;
        active = null;
        // Never include the token or upstream error in a callback or log.
        try { await onInvalidated({reason:'Twitch authorization expired or could not be validated.'}); } catch {}
      }
    }, delay);
    validationTimer.unref?.();
  }
  function callbackPage(res) {
    const nonce = crypto.randomBytes(18).toString('base64');
    res.writeHead(200, {...baseHeaders(), 'Content-Type':'text/html; charset=utf-8',
      'Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'"});
    res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PARALLAX · Connecting Twitch</title><style>body{background:#090b12;color:#eff4ec;font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh}main{max-width:520px;padding:32px}h1{font-size:36px;letter-spacing:-1.5px}p{color:#aeb9bd;line-height:1.6}a{color:#dff28d}</style><main><small>PARALLAX · PRIVATE LOCAL SETUP</small><h1 id="heading">Connecting Twitch.</h1><p id="status">Validating your authorization. Keep this window open.</p><a href="/">Return to studio</a></main><script nonce="'+nonce+'">'+
      "(async()=>{'use strict';const fragment=new URLSearchParams(location.hash.slice(1));const denied=new URLSearchParams(location.search).has('error');const token=fragment.get('access_token'),state=fragment.get('state');history.replaceState(null,'','/auth/callback');const status=document.getElementById('status'),heading=document.getElementById('heading');if(denied||!token||!state){heading.textContent='Authorization was not completed.';status.textContent='Return to local Twitch setup and try again.';return}try{const response=await fetch('/auth/complete',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,state})});fragment.delete('access_token');if(!response.ok)throw new Error('Unable to connect');heading.textContent='Twitch authorized.';status.textContent='Returning to your studio. The chat connection will now start.';setTimeout(()=>location.replace('/'),500)}catch{heading.textContent='Could not connect Twitch.';status.textContent='Authorization may have expired or the app redirect/client may not match. Restart from local setup.'}})();"+
      '</script></html>');
  }
  async function complete(req, res) {
    if (!validRequest(req,true)) return json(res,403,{error:'Use the local setup page on localhost.'});
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return json(res,415,{error:'Expected JSON.'});
    let bytes=0, tooLarge=false;
    const chunks=[];
    try {
      for await (const chunk of req) { bytes+=chunk.length;if(bytes>MAX_BODY){tooLarge=true;continue}chunks.push(chunk); }
      if(tooLarge)return json(res,413,{error:'Request too large.'});
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || !/^[a-zA-Z0-9._-]{1,2048}$/.test(body.token || '') || !/^[a-f0-9]{64}$/.test(body.state || '')) {
        return json(res,400,{error:'Invalid authorization response.'});
      }
      const expires=pending.get(body.state);
      if (!expires || expires<Date.now() || !same(cookieValue(req),body.state)) return json(res,403,{error:'Authorization state expired or did not match.'});
      pending.delete(body.state);
      const identity=await validate(body.token);
      if(closed)return json(res,503,{error:'Setup closed.'});
      await onAuthorized({token:body.token,login:identity.login,channel});
      active={token:body.token,login:identity.login,userId:identity.user_id};
      scheduleValidation(identity);
      return json(res,200,{ok:true},{'Set-Cookie':clearCookie});
    } catch {
      // Avoid reflecting token-bearing input or upstream responses.
      return json(res,400,{error:'Twitch authorization could not be validated.'},{'Set-Cookie':clearCookie});
    }
  }
  function handle(req,res) {
    let url;
    try { url=new URL(req.url,'http://localhost'); } catch { return false; }
    if (!['/auth/twitch','/auth/callback','/auth/complete'].includes(url.pathname)) return false;
    if(closed){json(res,503,{error:'Setup closed.'});return true}
    if (!validRequest(req)) {json(res,403,{error:'Open setup at '+redirect.origin+'/auth/twitch on this computer.'});return true}
    if (url.pathname==='/auth/complete') {
      if(req.method!=='POST'){json(res,405,{error:'Use POST.'});return true}
      void complete(req,res).catch(()=>{if(!res.headersSent)json(res,500,{error:'Could not complete local setup.'});else res.end()});
      return true;
    }
    if(req.method!=='GET'){json(res,405,{error:'Use GET.'});return true}
    if(url.pathname==='/auth/callback'){callbackPage(res);return true}
    if(!/^[a-zA-Z0-9]{8,128}$/.test(clientId)){json(res,503,{error:'Set TWITCH_CLIENT_ID to your registered Twitch application public client ID.'});return true}
    for(const [state,expires] of pending)if(expires<Date.now())pending.delete(state);
    if(pending.size>=20){json(res,429,{error:'Too many authorization attempts. Try again shortly.'});return true}
    const state=crypto.randomBytes(32).toString('hex');
    pending.set(state,Date.now()+10*60*1000);
    const auth=new URL('https://id.twitch.tv/oauth2/authorize');
    auth.search=new URLSearchParams({response_type:'token',client_id:clientId,redirect_uri:redirect.href,scope:'chat:read',state}).toString();
    res.writeHead(302,{...baseHeaders(),'Location':auth.href,'Set-Cookie':COOKIE+'='+state+'; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=600'});
    res.end();
    return true;
  }
  function close(){closed=true;clearTimeout(validationTimer);active=null;pending.clear()}
  return {handle,close};
}
module.exports={createTwitchSetup};

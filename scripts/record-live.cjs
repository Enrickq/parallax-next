'use strict';

// Record the local continuation only. Chat contributions must arrive through Twitch.
// This script never sends or fabricates a Twitch chat message.
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {createHash} = require('node:crypto');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const base = process.env.PARALLAX_URL || 'http://127.0.0.1:3002';
const video = path.join(root, 'video');
const recording = path.join(video, 'PARALLAX-live.mp4');
const proofFile = path.join(video, 'LIVE_PROOF.json');
const ffmpeg = process.env.FFMPEG_PATH || path.resolve(root, '../.tools/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');

async function main() {
  const target = new URL(base);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) throw new Error('Use a disposable local continuation server. Remote director controls are refused.');
  if (Date.now() < Date.parse('2026-11-03T00:00:00Z')) throw new Error('This recorder is reserved for the post-deadline continuation.');
  await fs.mkdir(video, {recursive:true});
  const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge', headless:true});
  let encoder, encoderDone, session;
  try {
    const page = await browser.newPage({viewport:{width:1600, height:900}});
    const state = async () => (await page.request.get(base + '/api/state')).json();
    const act = async data => { const r = await page.request.post(base + '/api/director', {data}); if (!r.ok()) throw new Error(await r.text()); };
    await page.goto(base);
    const initial = await state();
    if (initial.mode !== 'live' || !initial.connected) throw new Error('A confirmed real Twitch connection is required before capture.');
    if (initial.channel !== 'enriedit') throw new Error('This narration is written for #enriedit. Update both narration and channel verification before using another channel.');
    await act({action:'reset'});
    await act({action:'open', duration:90});
    encoder = spawn(ffmpeg, ['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','10','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',recording], {windowsHide:true, stdio:['pipe','ignore','pipe']});
    let errors = '';
    encoder.stderr.on('data', d => { errors += d; });
    encoderDone = new Promise((resolve, reject) => { encoder.on('error', reject); encoder.on('close', code => code === 0 ? resolve() : reject(new Error(errors))); });
    // Attach the rejection handler immediately, while retaining the awaited result.
    encoderDone.catch(() => {});
    let frame = await page.screenshot({type:'jpeg', quality:90});
    session = await page.context().newCDPSession(page);
    session.on('Page.screencastFrame', e => { frame = Buffer.from(e.data,'base64'); session.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(() => {}); });
    await session.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1600,maxHeight:900,everyNthFrame:2});
    console.log('ROUND OPEN — send !a and !spark hope in the actual Twitch #enriedit chat now.');
    const began = Date.now();
    const startedAt = new Date(began).toISOString();
    let firstVoteSeconds = null, firstSparkSeconds = null, receivedVotes = 0, receivedSparks = 0, collapsed = false, lens = false, finalState, frames = 0, finishAt = 90;
    for (let i = 0; i < finishAt * 10; i++) {
      const seconds = i / 10;
      if (i % 10 === 0) {
        finalState = await state();
        if (!finalState.connected) throw new Error('Twitch connection was lost during capture.');
        receivedVotes = Math.max(receivedVotes, finalState.totalVotes);
        receivedSparks = Math.max(receivedSparks, finalState.sparks.length);
        if (receivedVotes && firstVoteSeconds === null) { firstVoteSeconds = seconds; console.log('ACTUAL TWITCH VOTE RECEIVED at ' + seconds + 's'); }
        if (receivedSparks && firstSparkSeconds === null) { firstSparkSeconds = seconds; console.log('ACTUAL TWITCH SPARK RECEIVED at ' + seconds + 's'); }
        if (receivedVotes && receivedSparks && !collapsed && seconds >= Math.max(firstVoteSeconds,firstSparkSeconds) + 6) {
          await act({action:'collapse'}); collapsed = true; finishAt = Math.min(90, seconds + 24);
          console.log('Real contributions received; canonical world committed.');
        }
        if (collapsed && !lens && seconds >= finishAt - 12) {
          await page.locator('#reveal-dismiss').click();
          await page.locator('#butterfly-lens').scrollIntoViewIfNeeded();
          lens = true;
        }
      }
      if (!encoder.stdin.write(frame)) await once(encoder.stdin,'drain');
      frames++;
      const rest = began + (i + 1) * 100 - Date.now();
      if (rest > 0) await new Promise(r => setTimeout(r,rest));
    }
    await session.send('Page.stopScreencast');
    await session.detach(); session = null;
    encoder.stdin.end(); await encoderDone;
    finalState = await state();
    const recordingSha256 = createHash('sha256').update(await fs.readFile(recording)).digest('hex');
    const proof = {edition:'post-deadline-portfolio', startedAt, at:new Date().toISOString(), recordingFile:path.basename(recording), recordingSha256, receivedVotes, receivedSparks, firstVoteSeconds, firstSparkSeconds, durationSeconds:frames/10, channel:initial.channel, connectionType:initial.connectionType, world:finalState.world, history:finalState.history};
    await fs.writeFile(proofFile, JSON.stringify(proof,null,2));
    if (!receivedVotes || !receivedSparks) throw new Error('The recording received no valid vote and spark pair. It is not accepted as real-interaction evidence.');
    const decision = finalState.history[0];
    if (decision?.winner !== 'a' || !decision.sparks.some(s => (typeof s === 'string' ? s : s.word) === 'hope')) throw new Error('Narration expects Aurora and the word hope; inspect actual contributions before assembly.');
    console.log('POST-DEADLINE TWITCH CAPTURE COMPLETE: ' + JSON.stringify({receivedVotes,receivedSparks,durationSeconds:frames/10,recordingSha256}));
  } finally {
    if (session) await session.send('Page.stopScreencast').catch(() => {});
    if (encoder && !encoder.stdin.writableEnded) encoder.stdin.end();
    await browser.close();
  }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

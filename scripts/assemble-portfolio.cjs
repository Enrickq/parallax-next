'use strict';

// Export a separate, dated portfolio video. Never replaces the submitted video.
// Narration must be supplied from a selected natural voice; no system-voice fallback.
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname,'..');
const video = path.join(root,'video');
const ffmpeg = process.env.FFMPEG_PATH || path.resolve(root,'../.tools/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const narration = JSON.parse(fs.readFileSync(path.join(__dirname,'portfolio-narration.json'),'utf8'));
const pictureOnly = process.argv.includes('--picture-only');
const output = path.join(video,pictureOnly ? 'PARALLAX-PORTFOLIO-PICTURE-2026-11-03.mp4' : 'PARALLAX-PORTFOLIO-2026-11-03.mp4');

function run(args, allowFailure = false) {
  return new Promise((resolve,reject) => {
    const child = spawn(ffmpeg,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let out = '',err = '';
    child.stdout.on('data',d => {out += d;}); child.stderr.on('data',d => {err += d;});
    child.on('error',reject);
    child.on('close',code => code === 0 || allowFailure ? resolve({code,out,err}) : reject(new Error('FFmpeg failed: ' + err.slice(-5000))));
  });
}

function verifiedEvidence() {
  const file = path.join(video,'LIVE_PROOF.json');
  if (!fs.existsSync(file)) throw new Error('Missing post-deadline LIVE_PROOF.json. Record actual Twitch contributions first.');
  const proof = JSON.parse(fs.readFileSync(file,'utf8'));
  if (proof.edition !== 'post-deadline-portfolio' || Date.parse(proof.startedAt) < Date.parse('2026-11-03T00:00:00Z') || !Number.isFinite(Date.parse(proof.startedAt))) throw new Error('A freshly dated post-deadline recording is required.');
  if (!(proof.receivedVotes > 0 && proof.receivedSparks > 0)) throw new Error('Real vote and spark evidence is required; a connected badge alone is insufficient.');
  if (![proof.firstVoteSeconds,proof.firstSparkSeconds,proof.durationSeconds].every(Number.isFinite) || Math.min(proof.firstVoteSeconds,proof.firstSparkSeconds) < 0 || Math.max(proof.firstVoteSeconds,proof.firstSparkSeconds) >= proof.durationSeconds) throw new Error('Invalid recorded contribution timing.');
  if (proof.channel !== 'enriedit') throw new Error('The narration names #enriedit; use matching evidence.');
  const decision = proof.history?.[0];
  if (decision?.winner !== 'a' || !(decision.sparks || []).some(s => (typeof s === 'string' ? s : s.word) === 'hope')) throw new Error('The recorded result does not match the Aurora/hope narration.');
  const recording = path.join(video,'PARALLAX-live.mp4');
  if (!fs.existsSync(recording) || !proof.recordingSha256 || createHash('sha256').update(fs.readFileSync(recording)).digest('hex') !== proof.recordingSha256) throw new Error('Live recording does not match its evidence file.');
  return proof;
}

async function main() {
  const proof = verifiedEvidence();
  if (process.argv.includes('--check-evidence')) { console.log('Post-deadline live evidence verified.'); return; }
  if (!fs.existsSync(ffmpeg)) throw new Error('Set FFMPEG_PATH to the local FFmpeg executable.');
  const raw = process.env.REHEARSAL_VIDEO || path.join(video,'PARALLAX-rehearsal.mp4');
  if (!fs.existsSync(raw)) throw new Error('Missing raw rehearsal footage. Use REHEARSAL_VIDEO or copy the existing raw local MP4 to video/.');
  const audioDir = process.env.PORTFOLIO_AUDIO_DIR || video;
  const audio = pictureOnly ? [] : narration.segments.map(segment => {
    const stem = segment.file.replace(/\.[^.]+$/,'');
    const candidates = [segment.file,stem+'.mp3',stem+'.m4a',stem+'.flac'].map(file => path.join(audioDir,file));
    const file = candidates.find(file => fs.existsSync(file));
    if (!file) throw new Error('Missing selected-voice narration: ' + segment.file + '. Generate the segments in portfolio-narration.json with one consistent natural voice.');
    return file;
  });
  const audioDurations = [];
  for (const file of audio) {
    const check = await run(['-hide_banner','-i',file,'-f','null','-']);
    const match = check.err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) throw new Error('Cannot measure narration duration: ' + file);
    const seconds = Number(match[1])*3600 + Number(match[2])*60 + Number(match[3]);
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid narration duration: ' + file);
    audioDurations.push(seconds);
  }
  // Preserve the selected voice at its original pace. Extend each scene to its
  // narration, then align every cut to a 30 FPS frame rather than speeding speech.
  let totalFrames = 0;
  const timeline = narration.segments.map((segment,index) => {
    const minimum = pictureOnly ? segment.duration : Math.max(segment.duration,audioDurations[index]+0.2);
    const frames = Math.ceil(minimum*30-1e-7);
    const result = {...segment,start:totalFrames/30,duration:frames/30,audioDurationSeconds:pictureOnly ? null : audioDurations[index]};
    totalFrames += frames;
    return result;
  });
  const totalDuration = totalFrames/30;
  if (totalDuration > 179) throw new Error(`Natural narration needs ${totalDuration.toFixed(2)} seconds. Shorten or regenerate longer segments to keep the film at or below 179 seconds; speech will not be accelerated.`);
  if (process.argv.includes('--timing-only')) {
    console.log(JSON.stringify({durationSeconds:totalDuration,pictureOnly,narrationPlaybackRate:1,timeline},null,2));
    return;
  }
  const font = "fontfile='C\\:/Windows/Fonts/arial.ttf'";
  const fmt = 'fps=30,setsar=1,format=yuv420p';
  const clean = 'crop=1600:790:0:0,pad=1600:900:0:0:color=black';
  const label = text => `drawtext=${font}:text='${text}':x=32:y=830:fontsize=22:fontcolor=0xe6f78c:box=1:boxcolor=black@0.9:boxborderw=12`;
  const start = Math.max(0,Math.min(proof.firstVoteSeconds,proof.firstSparkSeconds)-3);
  if (Math.max(proof.firstVoteSeconds,proof.firstSparkSeconds)-start > 20) throw new Error('Vote and spark are too far apart for the selected live excerpt; record them within twenty seconds of each other.');
  const chatStill = path.join(video,'twitch-chat-proof.jpg');
  const hasChatStill = fs.existsSync(chatStill);
  const showChatAt = Math.max(proof.firstVoteSeconds,proof.firstSparkSeconds)-start+0.5;
  const liveScale = hasChatStill ? 'scale=1280:720,pad=1600:900:0:100:color=0x080a10' : 'scale=1600:900:force_original_aspect_ratio=decrease,pad=1600:900:(ow-iw)/2:(oh-ih)/2:color=black';
  // Original raw scenes: hook, seven simulation beats, build artifacts, ending.
  // Only simulation/artifact footage is retimed; the actual Twitch capture stays 1x.
  const rawScenes = [
    {index:0,start:0,end:8,label:'POST-DEADLINE PORTFOLIO DEMO - 3 NOV 2026'},
    {index:2,start:8,end:20,label:'SIMULATION WALKTHROUGH'},
    {index:3,start:20,end:32,label:'SIMULATION WALKTHROUGH'},
    {index:4,start:32,end:40,label:'SIMULATION WALKTHROUGH'},
    {index:5,start:40,end:55,label:'SIMULATION WALKTHROUGH'},
    {index:6,start:55,end:68,label:'SIMULATION WALKTHROUGH'},
    {index:7,start:68,end:80,label:'SIMULATION WALKTHROUGH'},
    {index:8,start:80,end:90,label:'SIMULATION WALKTHROUGH'},
    {index:9,start:90,end:107,label:'ACTUAL BUILD ARTIFACTS - CODEX USAGE EXPLAINED'},
    {index:10,start:107,end:116,label:'SEPARATE PORTFOLIO DEMO - NOT THE SUBMITTED RECORDING'}
  ];
  if (timeline.length !== 11) throw new Error('This edit requires the eleven planned narration scenes.');
  const filters = [`[0:v]split=${rawScenes.length}${rawScenes.map(scene=>`[raw${scene.index}]`).join('')}`];
  for (const scene of rawScenes) {
    const duration = timeline[scene.index].duration;
    const factor = (duration/(scene.end-scene.start)).toFixed(12);
    filters.push(`[raw${scene.index}]trim=start=${scene.start}:end=${scene.end},setpts=(PTS-STARTPTS)*${factor},${clean},${label(scene.label)},${fmt},tpad=stop_mode=clone:stop_duration=1,trim=duration=${duration}[scene${scene.index}]`);
  }
  const liveDuration = timeline[1].duration;
  filters.push(`[1:v]trim=start=${start}:duration=${liveDuration},setpts=PTS-STARTPTS,${liveScale},tpad=stop_mode=clone:stop_duration=${liveDuration},trim=duration=${liveDuration},drawtext=${font}:text='ACTUAL TWITCH CONTRIBUTIONS - POST-DEADLINE CAPTURE':x=32:y=24:fontsize=20:fontcolor=0xe6f78c:box=1:boxcolor=black@0.9:boxborderw=10,${fmt}[livebase]`);
  if (hasChatStill) {
    filters.push(`[2:v]crop=292:190:1244:50,scale=280:-1,setsar=1[chatstill]`);
    filters.push(`[livebase][chatstill]overlay=x=1300:y=200:shortest=1:enable='gte(t,${showChatAt})',drawtext=${font}:text='TWITCH CHAT':x=1300:y=132:fontsize=22:fontcolor=0xe6f78c:enable='gte(t,${showChatAt})',drawtext=${font}:text='STILL CAPTURE - ENRIEDIT':x=1300:y=168:fontsize=14:fontcolor=0xb7c2b4:enable='gte(t,${showChatAt})'[scene1]`);
  } else filters.push('[livebase]null[scene1]');
  filters.push(timeline.map((_,index)=>`[scene${index}]`).join('')+`concat=n=${timeline.length}:v=1:a=0[v]`);
  const args = ['-y','-hide_banner','-loglevel','warning','-i',raw,'-i',path.join(video,'PARALLAX-live.mp4')];
  if (hasChatStill) args.push('-loop','1','-i',chatStill);
  const firstAudioInput = hasChatStill ? 3 : 2;
  for (const file of audio) args.push('-i',file);
  const subtitleCues = [];
  const subtitleTime = seconds => {
    const total = Math.round(seconds * 1000);
    return `${String(Math.floor(total/3600000)).padStart(2,'0')}:${String(Math.floor(total/60000)%60).padStart(2,'0')}:${String(Math.floor(total/1000)%60).padStart(2,'0')},${String(total%1000).padStart(3,'0')}`;
  };
  for (let i = 0; i < audio.length; i++) {
    const segment = timeline[i];
    const words = segment.text.split(/\s+/);
    const speechDuration = audioDurations[i];
    for (let word = 0; word < words.length; word += 12) {
      const end = Math.min(words.length,word+12);
      const captionWords = words.slice(word,end);
      const lines = [''];
      for (const next of captionWords) {
        if (lines[lines.length-1].length + next.length + 1 > 42) lines.push(next);
        else lines[lines.length-1] += (lines[lines.length-1] ? ' ' : '') + next;
      }
      subtitleCues.push(`${subtitleCues.length+1}\n${subtitleTime(segment.start+speechDuration*word/words.length)} --> ${subtitleTime(segment.start+speechDuration*end/words.length)}\n${lines.join('\n')}\n`);
    }
    filters.push(`[${i+firstAudioInput}:a]aresample=48000,apad,atrim=duration=${segment.duration},asetpts=PTS-STARTPTS,afade=t=out:st=${segment.duration-0.08}:d=0.08,adelay=${Math.round(segment.start*1000)}:all=1[a${i}]`);
  }
  if (!pictureOnly) filters.push(timeline.map((_,i) => `[a${i}]`).join('') + `amix=inputs=${audio.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=9,atrim=duration=${totalDuration}[a]`);
  args.push('-filter_complex',filters.join(';'),'-map','[v]');
  if (pictureOnly) args.push('-an');
  else args.push('-map','[a]','-c:a','aac','-b:a','192k','-ar','48000');
  args.push('-t',String(totalDuration),'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',output);
  await run(args);
  await run(['-hide_banner','-i',output,'-f','null','-']);
  if (!pictureOnly) fs.writeFileSync(path.join(video,'PARALLAX-PORTFOLIO-EN.srt'),subtitleCues.join('\n'));
  fs.writeFileSync(path.join(video,pictureOnly ? 'PORTFOLIO_PICTURE_METADATA.json' : 'PORTFOLIO_METADATA.json'),JSON.stringify({edition:narration.edition,file:path.basename(output),pictureOnly,durationSeconds:totalDuration,narrationPlaybackRate:1,livePlaybackRate:1,sceneTimings:timeline.map(segment=>({file:segment.file,start:segment.start,duration:segment.duration,audioDurationSeconds:segment.audioDurationSeconds})),bytes:fs.statSync(output).size,recordingSha256:proof.recordingSha256,liveReceivedVotes:proof.receivedVotes,liveReceivedSparks:proof.receivedSparks,chatContextIsLabelledStill:hasChatStill,codexUsageExplained:!pictureOnly,codexUIFootageClaimed:false,submittedVideoReplaced:false,generatedAt:new Date().toISOString()},null,2));
  console.log('PORTFOLIO EXPORT READY: ' + output);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

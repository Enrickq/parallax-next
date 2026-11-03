# Separate portfolio recording — 3 November 2026

The submitted GitHub repository, YouTube video and Devpost links stay unchanged. This workflow builds a new, explicitly post-deadline demonstration from the local continuation. It does not establish that a recording or feature was submitted before the deadline.

## Record actual contributions

Start this copy's server with a disposable persistence file and its own port:

```powershell
$env:TWITCH_CHANNEL = 'enriedit'
$env:TWITCH_ANONYMOUS = '1'
$env:PORT = '3002'
$env:DATA_FILE = '.parallax-live-data.json'
node server.js
```

In another PowerShell window, set `PLAYWRIGHT_MODULE` and `FFMPEG_PATH` to the locally available tools, then run:

```powershell
$env:PARALLAX_URL = 'http://127.0.0.1:3002'
node scripts/record-live.cjs
```

The script resets only that local world, opens a ninety-second round, and waits. Send `!a` followed by `!spark hope` in the actual logged-in Twitch chat. Do not inject director votes or simulated events. The recorder itself never sends chat messages. Save a screenshot of the real channel messages as additional context if useful.

The recording is accepted only when a real vote and spark both arrive, the expected Aurora/hope result is present, and the live MP4 matches the evidence file's SHA-256 digest. The JSON records the actual post-deadline capture time. Keep this evidence local: it may contain viewer names or words.

## Narrate with one selected natural voice

`scripts/portfolio-narration.json` contains eleven segments, exact filenames, minimum scene timing and text. Its planned picture edit runs 2:28. Select a voice through the audio tool before generation. Generate each segment separately with that same voice, then save WAV, MP3, M4A or FLAC under the listed stem in `video/`, or set `PORTFOLIO_AUDIO_DIR` to another audio directory. The assembler does not use the old Microsoft Zira narration as a fallback.

The finished edit preserves the selected voice at its original speed, including its pauses. Before rendering, the assembler measures every supplied audio clip and gives each scene at least its planned duration or the measured speech duration plus 0.2 seconds, whichever is longer. Cuts and subtitle starts are recalculated on a 30 FPS timeline. Simulation and artifact shots may be slowed to fit; the actual Twitch capture always plays at its original speed, with a held final frame only if the narration needs more time. If the result would exceed **179 seconds**, export stops and asks for shorter narration rather than accelerating the voice.

The live narration describes the verified Aurora vote and hope spark. Change the words or rerecord if those are not the observed events. The other audience scenes are explicitly labelled simulation. The Codex section explains verified development work and shows build artifacts; it does not claim to show the Codex UI. The twenty-six checks refer to the separate local continuation.

## Export and review

The existing raw rehearsal remains available at the original local path. Point to it directly, without changing it:

```powershell
$env:REHEARSAL_VIDEO = '..\parallax-twitch-hackathon\video\PARALLAX-rehearsal.mp4'
node scripts/assemble-portfolio.cjs --check-evidence
node scripts/assemble-portfolio.cjs --timing-only
node scripts/assemble-portfolio.cjs
```

To review the visuals while voice selection is pending, run `node scripts/assemble-portfolio.cjs --picture-only`. This exports a separate silent picture preview and does not mark narration or the final film complete. When `video/twitch-chat-proof.jpg` is present, the live scene includes the real chat screenshot beside the recording, explicitly marked **STILL CAPTURE** and shown only after the contributions arrive. The crop is fitted to the verified local screenshot; inspect it again if replacing that image.

The output is `video/PARALLAX-PORTFOLIO-2026-11-03.mp4` (1600×900, 30 FPS, no more than 2:59). Its exact duration and scene starts depend on the measured narration; `--timing-only` prints that plan before rendering. The silent `--picture-only` preview stays at the planned 2:28 and does not require voice files. An English subtitle draft, `PARALLAX-PORTFOLIO-EN.srt`, uses the adjusted scene starts and each unaccelerated audio segment's measured duration. Its word timing is approximate: review and adjust it against the finished voice before uploading subtitles. Review the entire video with sound, confirm that captions match the real events, check the live excerpt includes both contributions and their result, and inspect the visible post-deadline labels. Audio is normalized for clear speech, without speech acceleration. Exact scene timings and playback-rate declarations are saved in metadata beside the output.

A new portfolio upload needs its own title and URL. Do not replace or edit the submitted video or its Devpost link without written organizer permission. Neither script publishes anything.

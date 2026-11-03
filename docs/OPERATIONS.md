# Operation and world rules

## Local routes

| Route | Purpose |
|---|---|
| `/` | Director studio and Butterfly Lens |
| `/overlay` | OBS browser source showing the shared world |
| `/how` | Short introduction |
| `GET /api/state` | Read-only JSON state |
| `GET /events` | Server-Sent Events |
| `POST /api/director` | Director actions |

## Decisions and memory

One username gets one vote and one spark per round. Repeated contributions are ignored; votes cannot be changed. `!a`, `!aurora`, `!echo` and `!origin` choose A; `!b`, `!supernova`, `!rift` and `!eclipse` choose B. `!future a` and `!future b` also work. Short commands remain stable as round titles change.

The server accepts contributions only during the voting window. It closes the round at expiry or when the director collapses early. A wins ties, including an empty round.

At collapse, both outcomes use the same origin, vote total and the latest **10** retained spark contributions. Only the winning branch changes the shared world. The DNA seed is a procedural rendering parameter; words do not trigger semantic AI interpretation. All valid votes contribute to cumulative vote memory. The word count records retained contributions encoded at collapse.

Both outcomes, aggregate votes, retained words and the common origin are archived. The short decision fingerprint identifies stored inputs and outcomes; it does not authenticate Twitch events. A historical alternate view is a calculated consequence, not a prediction.

## Storage

The default file `.parallax-data.json` stores the world and latest **12** decisions and is ignored by Git. `DATA_FILE` selects a different path. A restart restores this history and returns to idle. Legacy history without paired outcomes remains viewable but cannot provide a Butterfly Lens comparison. **RESET WORLD** clears local history and accumulated state.

Saved history contains contributed words and aggregate votes, not tokens or raw chat transcripts. During operation, participant names and recent command activity appear in the studio and public JSON state. Choose a channel where this display is appropriate.

The studio's “worldlines saved” metric counts retained history entries, up to twelve. It is not an all-time total.

## Hosting

The server binds to `127.0.0.1` on port `3000` by default. `HOST` and `PORT` override these settings. A non-loopback host requires a secret `CONTROL_KEY`; startup is refused without one. Enter the key in the studio's director field. Configure HTTPS and suitable access restrictions before exposing a server publicly. The JSON state and event stream are read-only, public surfaces.

The prototype uses one Node process and local storage. It does not provide multi-instance synchronization, a managed database or a public production service.

## Optional development tools

`scripts/browser-qa.cjs` verifies the studio and overlay against a disposable simulation server. It resets that world's data. Set `PLAYWRIGHT_MODULE` to an installed Playwright module and provide Edge, or select another `BROWSER_CHANNEL`.

The original `scripts/record-demo.cjs` and `scripts/mux-demo.cjs` produce a rehearsal using Playwright, FFmpeg and locally generated WAV files. `FFMPEG_PATH` selects FFmpeg. The rehearsal is visibly simulated and is not evidence of real Twitch participation. Optional recording tools are separate from the dependency-free application and its automated tests.

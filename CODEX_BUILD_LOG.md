# Codex build provenance

The entrant supplied the initial ZIP prototype. The following work extended that starter in a real OpenAI Codex session; the starter itself is not attributed to this session.

**Principal build session:** `01a19d6f-8834-70e3-b2ea-409c77ed5507`.

The identifier came from `CODEX_THREAD_ID` / `CODEX_SESSION_ID` runtime metadata. No execution of `/status` is claimed.

## Public baseline · 2 November 2026

The [frozen public commit](https://github.com/Enrickq/parallax-twitchcon-2026/commit/a8fdf5ef94c29c2aaad29d0e6198bc87de673f23) includes:

- Deterministic paired futures computed from one world snapshot, with winner-only commitment.
- Archived origin, both outcomes, theme and decision fingerprint, with compatibility for older history.
- Butterfly Lens comparisons, historical inspection and a labeled local what-if preview that leaves OBS unchanged.
- Stronger IRC parsing, room-join confirmation, PING/PONG handling and reconnect behavior.
- Director HTTP validation for origin, JSON format, request size and simulation/live separation.
- A fix for a reveal-event CSS collision, followed by simulation browser QA covering the studio, overlay, mobile layout and reduced motion.

The baseline's engine/HTTP suite passed **18 tests**; [GitHub CI passed](https://github.com/Enrickq/parallax-twitchcon-2026/actions/runs/41522272517). The original dated [build record](docs/archive/submission-2026-11-02/CODEX_BUILD_LOG.md) is preserved in the archive.

## Local continuation · 3 November 2026

The separate `parallax-next` clone imports additional source from the original working tree that was not published in the frozen baseline:

- An explicitly enabled anonymous public IRC reader, identified separately from authenticated access.
- A loopback-only OAuth helper with single-use state, cookie/origin checks, token validation and in-memory authorization.
- Additional handshake and OAuth behavioral checks, bringing the local suite to **26 tests**.
- Revised setup documentation and a reorganized product README, with old submission preparation notes archived.
- A clearer “WORLDLINES SAVED” label for the bounded history counter, and documentation of the ten-spark limit.

Validation: `node --test tests/*.test.js` completed with **26 passes and zero failures** on 3 November. This is verification of the local continuation, not a change to the submitted test count. No source or documentation from this copy has been published.

## Demonstration evidence

The existing 116-second rehearsal uses real local app footage, clearly labeled simulated viewers, synthetic English narration and actual build artifacts. It is not a live Twitch demonstration or a recording of the Codex interface.

The attempted real-chat capture on 2 November recorded a confirmed public-reader connection but **zero accepted votes and zero sparks**. No successful vote is inferred from that connection status or automated tests.

On **3 November 2026 at 16:41–16:42 UTC**, a new 53-second recording in the separate local continuation accepted **one actual vote and one actual spark** from Twitch `#enriedit`. The observed `!a` vote chose Aurora and `!spark hope` contributed the word `hope`; the committed world had harmony 56, entropy 44, memory 1, words 1 and DNA 222. The Butterfly Lens displayed both calculated outcomes and the real activity feed. A separate screenshot of the Twitch website showed the sent commands.

The local recording's SHA-256 matches its evidence JSON: `38be33048843c50969bd2b72829b55733d626a59bf11fe6905cab1acde72c1c7`. Full FFmpeg decoding and the portfolio assembler's evidence check passed; representative contribution and Lens frames were inspected. This is newly recorded **post-deadline** evidence, not a replacement for or addition to the frozen submission. The new narrated portfolio film has not yet been exported or published.

Current version and publication boundaries are recorded in [project status](docs/PROJECT_STATUS.md). Codex is the development tool; the running app uses procedural Canvas rendering and no AI API.

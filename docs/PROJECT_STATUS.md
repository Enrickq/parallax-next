# Project status · 3 November 2026

This directory is a post-deadline continuation, published separately as [Enrickq/parallax-next](https://github.com/Enrickq/parallax-next) on 3 November 2026. It has not been substituted into the competition entry; the submitted repository, video and links remain unchanged.

## Frozen public baseline

- Repository: [Enrickq/parallax-twitchcon-2026](https://github.com/Enrickq/parallax-twitchcon-2026)
- Commit: [`a8fdf5ef94c29c2aaad29d0e6198bc87de673f23`](https://github.com/Enrickq/parallax-twitchcon-2026/commit/a8fdf5ef94c29c2aaad29d0e6198bc87de673f23), 2 November 2026 at 20:46 UTC.
- [GitHub verification passed](https://github.com/Enrickq/parallax-twitchcon-2026/actions/runs/41522272517).
- The baseline contains the paired futures, Butterfly Lens, authenticated IRC connector, studio, OBS overlay, source instructions and six screenshots. Its original engine/HTTP suite contains 18 tests.
- Public project page: [PARALLAX on Devpost](https://devpost.com/software/parallax-the-butterfly-effect-of-twitch). The main review task verified the **Submitted** status on 3 November.
- Submitted video: [PARALLAX demonstration on YouTube](https://www.youtube.com/watch?v=l8p1U61pH5Y), 1:56. The main review task verified playback on the entrant's Enrique channel on 3 November. This is the original simulation rehearsal, not a later real-chat recording.

The [organizers' final-weekend notice](https://twitchcon-codex.devpost.com/updates/47341-final-weekend-make-your-project-come-alive) instructs entrants to keep the submitted repository, video and links unchanged until winners are announced and to continue development in a copy. This local clone follows that instruction. A new recording or improved narration must be identified as a later demo; replacing submitted material requires the organizers' permission.

## Local continuation

The original working directory contained additional changes not published in that baseline: the opt-in anonymous public reader, a loopback browser OAuth helper, accompanying tests and setup documentation. These have been copied here and published in this separate continuation repository, rather than added to the submitted source.

On 3 November, the documentation was reorganized into a concise product README, connection instructions, operation notes and this evidence record. The bounded history counter was relabeled “WORLDLINES SAVED” to describe its twelve-entry limit. Dated preparation documents remain in the [archive](archive/README.md). The source is provided for review and further development; its presence here does not change what was submitted.

Validation in this copy: **26 tests passed, 0 failed**, using `node --test tests/*.test.js` on 3 November 2026. The original simulation browser QA is a dated prior check, not a new live-stream test.

## Evidence boundaries

- The existing 116-second narrated rehearsal shows the local app in labeled simulation and actual build artifacts. It contains no complete real-chat interaction or Codex UI recording.
- The attempted public-reader recording on 2 November confirmed a connection, but its `LIVE_PROOF.json` recorded **zero votes and zero sparks**. It does not establish the complete Twitch command path.
- A new **post-deadline** live capture was completed on 3 November, from **16:41:24.799 to 16:42:18.603 UTC**, in this separate local continuation. The 53-second recording accepted **one real vote and one real spark**, both observed at 23 seconds, from public Twitch chat in `#enriedit`. Aurora won; `hope` contributed to a resulting world with harmony 56, entropy 44, memory 1, words 1 and DNA 222. The shared origin had harmony 50, memory 0, words 0 and DNA 137.
- The new capture's SHA-256 is `38be33048843c50969bd2b72829b55733d626a59bf11fe6905cab1acde72c1c7`, matching its local `video/LIVE_PROOF.json`. Full FFmpeg decoding and the portfolio assembler's evidence check passed. Representative contribution and Butterfly Lens frames were visually inspected, as was a separate screenshot of the actual Twitch chat showing `!a` and `!spark hope`.
- This evidence records an actual post-deadline command path. It does not establish that the new recording was part of the submitted entry, nor does it make the original simulation video a live demonstration. Automated tests and a connected badge remain distinct from command evidence.
- The actual Codex development session is identified in the [build log](../CODEX_BUILD_LOG.md). The runtime does not call an AI service.

The successful local live-message capture is now verified. No new public video or post-deadline submission change is claimed by this status file.

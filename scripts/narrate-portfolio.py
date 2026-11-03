"""Optional narration tool; it is not needed by the PARALLAX application.

Requires edge-tts. Uses a generic neural voice, never a cloned person's voice.
Outputs are local and ignored by Git. No account credentials are used.
"""
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "video" / "ava"


async def main():
    plan = json.loads((ROOT / "scripts" / "portfolio-narration.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    gate = asyncio.Semaphore(2)

    async def render(segment):
        async with gate:
            target = OUT / (Path(segment["file"]).stem + ".mp3")
            speech = edge_tts.Communicate(
                segment["text"], "en-US-AvaNeural", rate="-8%", pitch="-2Hz"
            )
            await speech.save(str(target))
            print(f"Narrated {target.name}", flush=True)

    await asyncio.gather(*(render(segment) for segment in plan["segments"]))
    (OUT / "VOICE_PROVENANCE.json").write_text(json.dumps({
        "voice": "en-US-AvaNeural",
        "service": "Microsoft Edge online text-to-speech via edge-tts",
        "rate": "-8%", "pitch": "-2Hz", "cloned_person": False,
        "edition": plan["edition"],
        "note": "Complete generic neural narration for the separate portfolio demonstration."
    }, indent=2), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())

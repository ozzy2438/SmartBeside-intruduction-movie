#!/usr/bin/env python3
"""English narration for the Kinbuild film. One calm voice, placed on the picture."""

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "vo"
VOICE = "en-GB-RyanNeural"

# Start times follow the picture. Each line ends before the next begins.
LINES = [
    (1.15, "It begins with four people."),
    (4.25, "One designs."),
    (6.80, "One reads the data."),
    (9.55, "One builds the system."),
    (12.40, "And one understands the economics."),
    (16.05, "Meeting is easy."),
    (18.65, "Building together is the work."),
    (21.75, "Then reality changes the plan."),
    (25.10, "Different strengths."),
    (30.70, "Kinbuild."),
    (32.75, "Don't build alone."),
]


async def render():
    OUT.mkdir(exist_ok=True)
    manifest = []
    for index, (start, text) in enumerate(LINES):
        destination = OUT / f"line_{index:02d}.mp3"
        voice = edge_tts.Communicate(text, VOICE, rate="-8%", pitch="-2Hz")
        await voice.save(str(destination))
        manifest.append({"t": start, "text": text, "file": destination.name})
        print(f"{index:02d} {start:.2f} {text}")
    (OUT / "lines.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    asyncio.run(render())

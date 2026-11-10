"""Generate source GIFs directly via OpenAI's documented Images API.

Run with the project image environment; OPENAI_API_KEY is read only from env.
The generated GIF is the source master. Web playback uses a compressed video
derivative so it can actually pause when off-screen or reduced motion is set.
"""
import argparse
import base64
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {"baking": "plaetzchen-backen.webp", "raclette": "plant-based-raclette.webp"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("theme", choices=SOURCES)
    args = parser.parse_args()
    output = ROOT / "public" / "images" / "theme-loops"
    output.mkdir(parents=True, exist_ok=True)
    target = output / f"{args.theme}.gif"
    if target.exists():
        raise SystemExit(f"Refusing to overwrite {target}; move the prior version first.")
    prompt = (ROOT / "docs" / "image-prompts" / f"theme-loop-{args.theme}.txt").read_text(encoding="utf-8")
    with (ROOT / "public" / "images" / "illustrations" / SOURCES[args.theme]).open("rb") as reference:
        result = OpenAI(timeout=600, max_retries=0).images.edit(
            model="gpt-image-2.6-sunburst",
            image=reference,
            prompt=prompt,
            quality="high",
            size="960x640",
            output_format="gif",
            n=1,
            extra_body={"frame_count": 12, "frame_duration_ms": 200},
        )
    encoded = result.data[0].b64_json
    if not encoded:
        raise RuntimeError("The API returned no animation bytes.")
    payload = base64.b64decode(encoded, validate=True)
    if payload[:6] not in (b"GIF87a", b"GIF89a"):
        raise RuntimeError("The API did not return a GIF.")
    target.write_bytes(payload)
    print(f"Created {target.name}: {len(payload)} bytes", flush=True)


if __name__ == "__main__":
    main()

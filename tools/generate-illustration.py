"""Generate one editorial illustration via OpenAI's Images API (edits endpoint).

Usage: python tools/generate-illustration.py <name> [reference.webp]
Reads docs/image-prompts/<name>.txt and writes <name>.webp plus the -medium
and -small derivatives. OPENAI_API_KEY is read only from the environment.
Standard library plus Pillow only, so no extra package is needed.
"""
import base64
import io
import json
import os
import sys
import urllib.request
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ILLUSTRATIONS = ROOT / "public" / "images" / "illustrations"
SIZES = {"": 1536, "-medium": 960, "-small": 600}


def multipart(fields, file_name, file_bytes):
    boundary = uuid.uuid4().hex
    body = io.BytesIO()
    for key, value in fields.items():
        body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{file_name}"\r\nContent-Type: image/png\r\n\r\n'.encode())
    body.write(file_bytes)
    body.write(f"\r\n--{boundary}--\r\n".encode())
    return boundary, body.getvalue()


def main():
    name = sys.argv[1]
    reference = ILLUSTRATIONS / (sys.argv[2] if len(sys.argv) > 2 else "plaetzchen-backen.webp")
    target = ILLUSTRATIONS / f"{name}.webp"
    if target.exists():
        raise SystemExit(f"Refusing to overwrite {target}; move the prior version first.")
    prompt = (ROOT / "docs" / "image-prompts" / f"{name}.txt").read_text(encoding="utf-8").strip()
    reference_png = io.BytesIO()
    Image.open(reference).convert("RGB").save(reference_png, "PNG")
    fields = {"model": "gpt-image-2.6-sunburst", "prompt": prompt, "quality": "high", "size": "1536x1024", "output_format": "png", "n": "1"}
    boundary, body = multipart(fields, "reference.png", reference_png.getvalue())
    request = urllib.request.Request("https://api.openai.com/v1/images/edits", data=body, method="POST", headers={
        "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    })
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"API error {error.code}: {error.read().decode('utf-8', 'replace')[:600]}")
    encoded = result["data"][0].get("b64_json")
    if not encoded:
        raise RuntimeError("The API returned no image bytes.")
    image = Image.open(io.BytesIO(base64.b64decode(encoded, validate=True))).convert("RGB")
    for suffix, width in SIZES.items():
        resized = image if image.width == width else image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
        resized.save(ILLUSTRATIONS / f"{name}{suffix}.webp", "WEBP", quality=84, method=6)
    print(f"Created {name}.webp ({image.width}x{image.height})", flush=True)


if __name__ == "__main__":
    main()

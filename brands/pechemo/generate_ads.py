#!/usr/bin/env python3
"""
generate_ads.py — Pollinations.ai Ad Image Generator
Reads prompts.json, fires each prompt to Pollinations.ai,
downloads results, and builds an HTML gallery.

Usage:
    python generate_ads.py                        # all prompts
    python generate_ads.py --templates 1,7,13     # specific templates only
"""

import os
import sys
import json
import time
import argparse
import urllib.parse
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Missing dependency: pip install requests")


# ── Config ────────────────────────────────────────────────────────────────────

POLLINATIONS_URL = "https://image.pollinations.ai/prompt"

NUM_IMAGES     = 4       # images generated per prompt
MAX_RETRIES    = 3       # retries per image on failure
RETRY_DELAY    = 5       # seconds between retries

# Aspect ratio to pixel dimensions mapping
ASPECT_DIMENSIONS = {
    "1:1":  (1024, 1024),
    "4:5":  (1024, 1280),
    "5:4":  (1280, 1024),
    "9:16": (720, 1280),
    "16:9": (1280, 720),
    "3:2":  (1200, 800),
    "2:3":  (800, 1200),
    "3:4":  (960, 1280),
    "4:3":  (1280, 960),
}


# ── Pollinations.ai Image Generation ─────────────────────────────────────────

def generate_single_image(prompt: str, width: int, height: int, seed: int) -> str:
    """Build a Pollinations.ai URL for a single image and return the download URL."""
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"{POLLINATIONS_URL}/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true&enhance=true"
    return url


def download_image(url: str, dest: Path) -> None:
    """Download an image from a URL and save it to dest."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, timeout=120, stream=True)
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return
        except Exception as e:
            if attempt < MAX_RETRIES:
                print(f"    Retry {attempt}/{MAX_RETRIES} after error: {e}")
                time.sleep(RETRY_DELAY)
            else:
                raise


def generate_images(prompt_data: dict) -> list[dict]:
    """
    Generate multiple images via Pollinations.ai and return a list of
    dicts with 'url', 'width', 'height', and 'seed'.
    """
    prompt = prompt_data["prompt"]
    aspect = prompt_data.get("aspect_ratio", "1:1")
    width, height = ASPECT_DIMENSIONS.get(aspect, (1024, 1024))

    images = []
    base_seed = int(time.time()) % 100000

    for i in range(NUM_IMAGES):
        seed = base_seed + i * 111
        url = generate_single_image(prompt, width, height, seed)
        images.append({"url": url, "seed": seed, "width": width, "height": height})

    return images


# ── Download & Save ───────────────────────────────────────────────────────────

def save_prompt_results(prompt_data: dict, images: list[dict], outputs_dir: Path) -> list[Path]:
    """Save all images + prompt.txt for a single prompt into the outputs folder."""
    num    = str(prompt_data["template_number"]).zfill(2)
    name   = prompt_data["template_name"].lower().replace(" ", "-")
    folder = outputs_dir / f"{num}-{name}"
    folder.mkdir(parents=True, exist_ok=True)

    # Save prompt text
    (folder / "prompt.txt").write_text(prompt_data["prompt"], encoding="utf-8")

    saved = []
    for i, img in enumerate(images, start=1):
        url  = img["url"]
        dest = folder / f"{name}_v{i}.png"
        print(f"  Downloading image {i}/{len(images)} → {dest.name}")
        download_image(url, dest)
        saved.append(dest)

    return saved


# ── HTML Gallery ──────────────────────────────────────────────────────────────

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{brand} — Ad Gallery</title>
<style>
  body {{ font-family: system-ui, sans-serif; background: #0f0f0f; color: #eee; margin: 0; padding: 24px; }}
  h1   {{ font-size: 1.6rem; margin-bottom: 4px; }}
  .meta {{ color: #888; font-size: 0.85rem; margin-bottom: 32px; }}
  .template {{ margin-bottom: 48px; }}
  .template h2 {{ font-size: 1rem; font-weight: 600; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 16px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }}
  .card img {{ width: 100%; border-radius: 8px; display: block; }}
  .card span {{ display: block; font-size: 0.72rem; color: #666; margin-top: 4px; }}
</style>
</head>
<body>
<h1>{brand} — Generated Ad Gallery</h1>
<p class="meta">Generated {generated_at} &nbsp;·&nbsp; {total_images} images across {total_templates} templates &nbsp;·&nbsp; Powered by Pollinations.ai</p>
{sections}
</body>
</html>
"""

def build_gallery(brand: str, generated_at: str, outputs_dir: Path) -> None:
    """Walk outputs/ and build index.html gallery."""
    sections = []
    total_images = 0

    for folder in sorted(outputs_dir.iterdir()):
        if not folder.is_dir():
            continue
        imgs = sorted(folder.glob("*.png")) + sorted(folder.glob("*.jpg"))
        if not imgs:
            continue

        total_images += len(imgs)
        cards = "\n".join(
            f'<div class="card"><img src="{img.relative_to(outputs_dir.parent)}" loading="lazy"><span>{img.name}</span></div>'
            for img in imgs
        )
        sections.append(
            f'<div class="template"><h2>{folder.name}</h2>'
            f'<div class="grid">{cards}</div></div>'
        )

    html = HTML_TEMPLATE.format(
        brand=brand,
        generated_at=generated_at,
        total_images=total_images,
        total_templates=len(sections),
        sections="\n".join(sections),
    )

    gallery_path = outputs_dir.parent / "index.html"
    gallery_path.write_text(html, encoding="utf-8")
    print(f"\nGallery saved → {gallery_path}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate ads via Pollinations.ai")
    parser.add_argument("--templates", help="Comma-separated template numbers to run, e.g. 1,7,13")
    parser.add_argument("--brand-dir", help="Path to brand folder (default: current directory)", default=".")
    args = parser.parse_args()

    brand_dir = Path(args.brand_dir).resolve()
    prompts_file = brand_dir / "prompts.json"
    outputs_dir = brand_dir / "outputs"

    # ── Load prompts.json ──
    if not prompts_file.exists():
        sys.exit(f"prompts.json not found in {brand_dir}")

    with open(prompts_file, encoding="utf-8") as f:
        data = json.load(f)

    brand        = data.get("brand", "Unknown Brand")
    generated_at = data.get("generated_at", "")
    prompts      = data.get("prompts", [])

    # ── Filter templates if requested ──
    if args.templates:
        selected = {int(t.strip()) for t in args.templates.split(",")}
        prompts = [p for p in prompts if p["template_number"] in selected]
        print(f"Filtered to templates: {sorted(selected)}")

    if not prompts:
        sys.exit("No prompts to process.")

    outputs_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nUsing Pollinations.ai — generating {NUM_IMAGES} images per prompt")
    print(f"Total prompts: {len(prompts)} — Expected images: {len(prompts) * NUM_IMAGES}")

    # ── Process each prompt ───────────────────────────────────────────────────
    total = len(prompts)
    all_saved = []

    for idx, prompt_data in enumerate(prompts, start=1):
        num  = prompt_data["template_number"]
        name = prompt_data["template_name"]
        aspect = prompt_data.get("aspect_ratio", "1:1")
        dims = ASPECT_DIMENSIONS.get(aspect, (1024, 1024))
        print(f"\n── [{idx}/{total}] Template {num}: {name} ({aspect} → {dims[0]}x{dims[1]}) ──")

        try:
            images = generate_images(prompt_data)
            saved  = save_prompt_results(prompt_data, images, outputs_dir)
            all_saved.extend(saved)
            print(f"  ✓ {len(saved)} image(s) saved")
        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            continue

    # ── Build gallery ──
    print("\n── Building HTML gallery ─────────────────────────────────────")
    build_gallery(brand, generated_at, outputs_dir)

    print(f"\nDone. {len(all_saved)} images generated.")


if __name__ == "__main__":
    main()

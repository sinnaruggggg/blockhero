from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_SIZE = (862, 1824)
SOURCE_BASE = ROOT / "\uc774\ubbf8\uc9c0" / "UI" / "\uba54\uc778\ub85c\ube44" / "home_background_clean.png"
OUT_DIR = ROOT / "src" / "assets" / "ui" / "optimized"
ARCHIVE_DIR = ROOT / "release-assets" / "main-lobby-world-backgrounds-2026-05-03"


WORLD_LABELS = {
    1: "grassland",
    2: "desert",
    3: "snow",
    4: "underwater",
    5: "poison_forest",
    6: "ancient_ruins",
    7: "dark_castle",
    8: "sky_islands",
    9: "abyss_crystal",
    10: "volcano",
}


def fit_cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / img.width, target_h / img.height)
    resized = img.resize(
        (round(img.width * scale), round(img.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = max(0, (resized.width - target_w) // 2)
    top = max(0, (resized.height - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))


def save_world(world_id: int, source: Path) -> Path:
    image = Image.open(source).convert("RGB")
    normalized = fit_cover(image, REFERENCE_SIZE)

    archive_path = ARCHIVE_DIR / f"world_background_{world_id:02d}_{WORLD_LABELS[world_id]}.png"
    app_path = OUT_DIR / f"world_background_{world_id:02d}.jpg"
    normalized.save(archive_path)
    normalized.save(app_path, quality=90, optimize=True, progressive=True)
    return archive_path


def make_contact_sheet(paths: list[Path]) -> None:
    thumbs = []
    for path in paths:
        image = Image.open(path).convert("RGB")
        image.thumbnail((129, 274), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (149, 314), "white")
        tile.paste(image, ((149 - image.width) // 2, 10))
        draw = ImageDraw.Draw(tile)
        draw.text((10, 290), path.stem.replace("world_background_", ""), fill=(0, 0, 0))
        thumbs.append(tile)

    sheet = Image.new("RGB", (149 * 5, 314 * 2), (240, 240, 240))
    for index, tile in enumerate(thumbs):
        sheet.paste(tile, ((index % 5) * 149, (index // 5) * 314))
    sheet.save(ARCHIVE_DIR / "world_background_contact_sheet.jpg", quality=92)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import generated main lobby world backgrounds into app assets."
    )
    parser.add_argument(
        "--generated-dir",
        required=True,
        type=Path,
        help="Directory containing generated world 2-10 PNG files, sorted by creation time.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    generated_dir = args.generated_dir
    if not SOURCE_BASE.exists():
        raise FileNotFoundError(f"missing base background: {SOURCE_BASE}")
    if not generated_dir.exists():
        raise FileNotFoundError(f"missing generated dir: {generated_dir}")

    generated_files = sorted(
        generated_dir.glob("*.png"),
        key=lambda path: path.stat().st_mtime,
    )
    if len(generated_files) < 9:
        raise ValueError(
            f"expected at least 9 generated PNG files for worlds 2-10, got {len(generated_files)}"
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    imported: list[Path] = []
    imported.append(save_world(1, SOURCE_BASE))
    for world_id, source in zip(range(2, 11), generated_files[:9]):
        imported.append(save_world(world_id, source))

    raw_dir = ARCHIVE_DIR / "raw-generated"
    raw_dir.mkdir(exist_ok=True)
    for world_id, source in zip(range(2, 11), generated_files[:9]):
        shutil.copy2(source, raw_dir / f"world_{world_id:02d}_{source.name}")

    make_contact_sheet(imported)
    print(f"imported worlds: {len(imported)}")
    print(f"app assets: {OUT_DIR}")
    print(f"archive: {ARCHIVE_DIR}")


if __name__ == "__main__":
    main()

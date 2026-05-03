from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat


ROOT = Path(__file__).resolve().parents[1]
HOME_SPLIT = ROOT / "src" / "assets" / "ui" / "home_split"
WORLD_DIR = ROOT / "src" / "assets" / "ui" / "optimized"
SOURCE_DIR = ROOT / "\uc774\ubbf8\uc9c0" / "UI" / "\uba54\uc778\ub85c\ube44"
OUTPUT_DIR = ROOT / "output"

REFERENCE_SIZE = (862, 1824)
BOXES: dict[str, tuple[int, int, int, int]] = {
    "profile_card": (17, 22, 280, 103),
    "energy_pill": (397, 23, 200, 57),
    "gold_pill": (398, 82, 187, 55),
    "gem_pill": (572, 82, 164, 55),
    "settings_button": (755, 24, 86, 87),
    "logo": (249, 172, 365, 264),
    "side_event": (27, 407, 119, 137),
    "side_quest": (27, 560, 119, 137),
    "side_achievement": (27, 713, 119, 137),
    "side_mail": (27, 866, 119, 137),
    "side_shop": (726, 485, 118, 137),
    "side_pass": (726, 638, 118, 137),
    "side_friends": (726, 790, 118, 137),
    "play_panel": (23, 1072, 816, 550),
    "primary_play": (74, 1184, 714, 134),
    "mode_battle": (53, 1362, 166, 219),
    "mode_raid": (247, 1362, 166, 219),
    "mode_endless": (441, 1362, 166, 219),
    "mode_ranking": (635, 1362, 166, 219),
    "bottom_nav": (27, 1657, 809, 145),
    "nav_home": (31, 1660, 191, 140),
    "nav_bag": (223, 1660, 202, 140),
    "nav_skill": (425, 1660, 202, 140),
    "nav_codex": (627, 1660, 206, 140),
}

BUTTON_KEYS = {
    "profile_card",
    "energy_pill",
    "gold_pill",
    "gem_pill",
    "settings_button",
    "side_event",
    "side_quest",
    "side_achievement",
    "side_mail",
    "side_shop",
    "side_pass",
    "side_friends",
    "primary_play",
    "mode_battle",
    "mode_raid",
    "mode_endless",
    "mode_ranking",
    "nav_home",
    "nav_bag",
    "nav_skill",
    "nav_codex",
}

ALERT_KEYS = {
    "side_event",
    "side_quest",
    "side_achievement",
    "side_mail",
    "side_shop",
    "side_pass",
    "side_friends",
    "mode_battle",
    "mode_raid",
    "mode_endless",
    "mode_ranking",
    "nav_home",
    "nav_bag",
    "nav_skill",
    "nav_codex",
}


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def require_size(path: Path, expected: tuple[int, int]) -> None:
    if not path.exists():
        raise FileNotFoundError(path)
    actual = image_size(path)
    if actual != expected:
        raise AssertionError(f"{path} expected {expected}, got {actual}")


def verify_home_split_sizes() -> None:
    require_size(HOME_SPLIT / "background_clean.png", REFERENCE_SIZE)
    for key, (_, _, width, height) in BOXES.items():
        require_size(HOME_SPLIT / f"{key}.png", (width, height))
        if key in BUTTON_KEYS:
            require_size(HOME_SPLIT / f"{key}_pressed.png", (width, height))
        if key in ALERT_KEYS:
            require_size(HOME_SPLIT / f"{key}_alert.png", (width, height))
            require_size(HOME_SPLIT / f"{key}_alert_pressed.png", (width, height))


def verify_world_background_sizes() -> None:
    for world_id in range(1, 11):
        require_size(WORLD_DIR / f"world_background_{world_id:02d}.jpg", REFERENCE_SIZE)


def compose_state_preview() -> Path:
    canvas = Image.open(HOME_SPLIT / "background_clean.png").convert("RGBA")
    alert_keys = {
        "side_event",
        "side_quest",
        "side_mail",
        "side_shop",
        "mode_battle",
        "mode_raid",
        "mode_endless",
        "nav_home",
        "nav_skill",
    }
    for key, (x, y, width, height) in BOXES.items():
        state = "_alert" if key in alert_keys else ""
        path = HOME_SPLIT / f"{key}{state}.png"
        if not path.exists():
            path = HOME_SPLIT / f"{key}.png"
        image = Image.open(path).convert("RGBA")
        if image.size != (width, height):
            raise AssertionError(f"{path} should be {(width, height)}, got {image.size}")
        canvas.alpha_composite(image, (x, y))
    out = OUTPUT_DIR / "main_lobby_state_verification.png"
    OUTPUT_DIR.mkdir(exist_ok=True)
    canvas.save(out)
    return out


def compare_static_reference(preview: Path) -> tuple[float, Path]:
    reference = Image.open(SOURCE_DIR / "home_reference_full.png").convert("RGB")
    generated = Image.open(preview).convert("RGB")
    diff = ImageChops.difference(reference, generated)
    draw = ImageDraw.Draw(diff)
    # Dynamic character and resource text differ by design; mark the ignored zones dark.
    ignored = [
        (204, 510, 726, 1100),
        (397, 23, 597, 137),
        (17, 22, 297, 125),
    ]
    for box in ignored:
        draw.rectangle(box, fill=(0, 0, 0))
    stat = ImageStat.Stat(diff)
    mean = sum(stat.mean) / 3
    out = OUTPUT_DIR / "main_lobby_state_static_diff.png"
    diff.save(out)
    return mean, out


def main() -> None:
    verify_home_split_sizes()
    verify_world_background_sizes()
    preview = compose_state_preview()
    mean_diff, diff = compare_static_reference(preview)
    print("home split sizes: ok")
    print("world background sizes: ok")
    print(f"state preview: {preview}")
    print(f"static diff mean excluding dynamic zones: {mean_diff:.3f}")
    print(f"static diff: {diff}")


if __name__ == "__main__":
    main()

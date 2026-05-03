from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = Path(
    os.environ.get(
        "BLOCKHERO_MAIN_LOBBY_SRC",
        ROOT / "\uc774\ubbf8\uc9c0" / "UI" / "\uba54\uc778\ub85c\ube44",
    )
)
OUT_DIR = ROOT / "src/assets/ui/home_split"
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

ALERT_VISIBLE = {
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

DYNAMIC_TEXT_RECTS = {
    "energy_pill": (44, 8, 130, 44),
    "gold_pill": (50, 8, 132, 44),
    "gem_pill": (53, 8, 112, 44),
}

SHEET_CROPS = {
    # Magenta source sheet. Crop includes enough padding for the transparent logo.
    "logo": ("01_top_hud_logo.png", (520, 422, 1230, 878), (365, 264)),
}

REFERENCE_STATE_ORDER = [
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
    "bottom_nav",
    "nav_home",
    "nav_bag",
    "nav_skill",
    "nav_codex",
]


def require_inputs() -> None:
    required = [
        "01_top_hud_logo.png",
        "02_side_buttons.png",
        "03_play_panel_modes.png",
        "04_bottom_nav.png",
        "home_background_clean.png",
        "home_reference_full.png",
        "play_panel.png",
    ]
    missing = [name for name in required if not (SRC_DIR / name).exists()]
    if missing:
        raise FileNotFoundError(f"missing lobby source files in {SRC_DIR}: {', '.join(missing)}")


def crop_from_reference(reference: Image.Image, key: str) -> Image.Image:
    x, y, w, h = BOXES[key]
    return reference.crop((x, y, x + w, y + h)).convert("RGBA")


def chroma_to_alpha(img: Image.Image) -> Image.Image:
    out = img.convert("RGBA")
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if a == 0 or (r > 210 and g < 70 and b > 170):
                pixels[x, y] = (r, g, b, 0)
    return out


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def alpha_mask_for(key: str, size: tuple[int, int], include_alert: bool = False) -> Image.Image:
    w, h = size
    if key.startswith("side_"):
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((0, 0, min(w, 104) - 1, max(1, h - 6)), radius=22, fill=255)
    elif key.startswith("mode_"):
        mask = rounded_mask(size, 24)
    elif key in {"profile_card", "play_panel"}:
        mask = rounded_mask(size, 34)
    elif key == "bottom_nav":
        mask = rounded_mask(size, 50)
    elif key == "primary_play":
        mask = rounded_mask(size, 24)
    elif key == "energy_pill":
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((0, 0, min(w, 173) - 1, max(1, h - 3)), radius=16, fill=255)
    elif key == "gold_pill":
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((0, 0, min(w, 170) - 1, max(1, h - 3)), radius=16, fill=255)
    elif key == "gem_pill":
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((0, 0, min(w, 158) - 1, max(1, h - 3)), radius=16, fill=255)
    elif key == "settings_button":
        mask = rounded_mask(size, 20)
    elif key == "nav_home":
        mask = rounded_mask(size, 36)
    elif key.startswith("nav_"):
        mask = Image.new("L", size, 255)
    else:
        mask = Image.new("L", size, 255)

    if include_alert:
        badge = Image.open(OUT_DIR / "alert_badge.png").convert("RGBA")
        bx, by = badge_position(key, size, badge.size)
        badge_layer = Image.new("L", size, 0)
        badge_layer.paste(badge.getchannel("A"), (bx, by))
        mask = Image.composite(Image.new("L", size, 255), mask, badge_layer)
    return mask


def apply_alpha_shape(key: str, img: Image.Image, include_alert: bool = False) -> Image.Image:
    shaped = img.convert("RGBA")
    mask = alpha_mask_for(key, shaped.size, include_alert=include_alert)
    alpha = shaped.getchannel("A")
    shaped.putalpha(Image.composite(alpha, Image.new("L", shaped.size, 0), mask))
    return shaped


def flatten_low_alpha_panel(img: Image.Image) -> Image.Image:
    """Repair semi-transparent highlight rows in the supplied blank panel source."""
    out = img.convert("RGBA")
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if a < 230 and r > 190 and g > 170 and b > 130:
                alpha = a / 255
                base = (255, 247, 231)
                pixels[x, y] = (
                    round(r * alpha + base[0] * (1 - alpha)),
                    round(g * alpha + base[1] * (1 - alpha)),
                    round(b * alpha + base[2] * (1 - alpha)),
                    255,
                )
    return out


def clear_text_rect(img: Image.Image, rect: tuple[int, int, int, int]) -> Image.Image:
    out = img.copy()
    pixels = out.load()
    x1, y1, x2, y2 = rect
    for y in range(y1, y2):
        samples = []
        for x in range(out.width):
            if x1 <= x < x2:
                continue
            r, g, b, a = pixels[x, y]
            if a > 220 and r > 170 and g > 140 and b > 95 and r > b:
                samples.append((r, g, b, a))
        fill = tuple(round(sum(px[i] for px in samples) / len(samples)) for i in range(4)) if samples else pixels[max(0, x1 - 4), y]
        for x in range(x1, x2):
            pixels[x, y] = fill
    return out


def make_alert_badge(reference: Image.Image) -> Image.Image:
    badge = reference.crop((107, 396, 152, 441)).resize((42, 42), Image.Resampling.LANCZOS)
    alpha = Image.new("L", badge.size, 0)
    draw = ImageDraw.Draw(alpha)
    draw.ellipse((1, 1, 40, 40), fill=255)
    badge.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.35)))
    return badge


def badge_position(key: str, image_size: tuple[int, int], badge_size: tuple[int, int]) -> tuple[int, int]:
    w, _ = image_size
    bw, _ = badge_size
    if key.startswith("side_"):
        return max(0, w - bw + 4), 0
    if key.startswith("mode_"):
        return max(0, w - bw + 2), 0
    if key.startswith("nav_"):
        return max(0, w - bw + 2), 0
    return max(0, w - bw), 0


def remove_alert_badge(key: str, img: Image.Image) -> Image.Image:
    badge = Image.open(OUT_DIR / "alert_badge.png").convert("RGBA")
    bx, by = badge_position(key, img.size, badge.size)
    out = img.copy()
    patch = out.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    mask = Image.new("L", out.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((bx - 5, by - 5, bx + badge.width + 5, by + badge.height + 5), fill=255)
    return Image.composite(patch, out, mask.filter(ImageFilter.GaussianBlur(1.2)))


def paste_alert(key: str, img: Image.Image) -> Image.Image:
    badge = Image.open(OUT_DIR / "alert_badge.png").convert("RGBA")
    out = img.copy()
    out.alpha_composite(badge, badge_position(key, out.size, badge.size))
    return apply_alpha_shape(key, out, include_alert=True)


def make_pressed(img: Image.Image) -> Image.Image:
    dimmed = ImageEnhance.Brightness(img).enhance(0.82)
    dimmed = ImageEnhance.Contrast(dimmed).enhance(0.94)
    pressed = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pressed.alpha_composite(dimmed, (0, max(1, round(img.height * 0.018))))
    return pressed


def load_sheet_asset(key: str) -> Image.Image | None:
    if key not in SHEET_CROPS:
        return None
    sheet_name, box, size = SHEET_CROPS[key]
    sheet = Image.open(SRC_DIR / sheet_name).convert("RGBA")
    img = chroma_to_alpha(sheet.crop(box))
    img = img.resize(size, Image.Resampling.LANCZOS)
    return img


def save_asset(name: str, img: Image.Image) -> None:
    img.save(OUT_DIR / f"{name}.png")


def generate_assets() -> dict[str, object]:
    require_inputs()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    reference = Image.open(SRC_DIR / "home_reference_full.png").convert("RGBA")
    if reference.size != REFERENCE_SIZE:
        raise ValueError(f"home_reference_full.png must be {REFERENCE_SIZE}, got {reference.size}")

    shutil.copy2(SRC_DIR / "home_background_clean.png", OUT_DIR / "background_clean.png")
    make_alert_badge(reference).save(OUT_DIR / "alert_badge.png")

    raw_play_panel = Image.open(SRC_DIR / "play_panel.png").convert("RGBA")
    save_asset("play_panel", flatten_low_alpha_panel(raw_play_panel))

    generated: dict[str, dict[str, str]] = {}
    for key in REFERENCE_STATE_ORDER:
        if key == "play_panel":
            continue
        sheet_asset = load_sheet_asset(key)
        if sheet_asset is not None:
            normal = apply_alpha_shape(key, sheet_asset)
        else:
            visible = crop_from_reference(reference, key)
            visible = clear_text_rect(visible, DYNAMIC_TEXT_RECTS[key]) if key in DYNAMIC_TEXT_RECTS else visible
            if key in ALERT_VISIBLE:
                visible = remove_alert_badge(key, visible)
            normal = apply_alpha_shape(key, visible)
        save_asset(key, normal)
        generated[key] = {"normal": f"{key}.png"}

        if key in BUTTON_KEYS:
            pressed = make_pressed(normal)
            save_asset(f"{key}_pressed", pressed)
            generated[key]["pressed"] = f"{key}_pressed.png"

        if key in ALERT_KEYS:
            alert = paste_alert(key, normal)
            save_asset(f"{key}_alert", alert)
            alert_pressed = make_pressed(alert)
            save_asset(f"{key}_alert_pressed", alert_pressed)
            generated[key]["alert"] = f"{key}_alert.png"
            generated[key]["alertPressed"] = f"{key}_alert_pressed.png"

    manifest: dict[str, object] = {
        "source": str(SRC_DIR).replace("\\", "/"),
        "reference": "home_reference_full.png",
        "background": "background_clean.png",
        "states": generated,
    }
    manifest["states"]["play_panel"] = {"normal": "play_panel.png"}
    with (OUT_DIR / "home_split_manifest.json").open("w", encoding="utf-8") as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=2)
    return manifest


def compose_verification() -> None:
    canvas = Image.open(OUT_DIR / "background_clean.png").convert("RGBA")
    placements = [
        ("profile_card", "normal"),
        ("energy_pill", "normal"),
        ("gold_pill", "normal"),
        ("gem_pill", "normal"),
        ("settings_button", "normal"),
        ("logo", "normal"),
        ("side_event", "alert"),
        ("side_quest", "alert"),
        ("side_achievement", "normal"),
        ("side_mail", "alert"),
        ("side_shop", "alert"),
        ("side_pass", "normal"),
        ("side_friends", "normal"),
        ("play_panel", "normal"),
        ("primary_play", "normal"),
        ("mode_battle", "alert"),
        ("mode_raid", "alert"),
        ("mode_endless", "alert"),
        ("mode_ranking", "normal"),
        ("bottom_nav", "normal"),
        ("nav_home", "alert"),
        ("nav_bag", "normal"),
        ("nav_skill", "alert"),
        ("nav_codex", "normal"),
    ]
    for key, state in placements:
        suffix = "" if state == "normal" else f"_{state}"
        img = Image.open(OUT_DIR / f"{key}{suffix}.png").convert("RGBA")
        x, y, w, h = BOXES[key]
        if img.size != (w, h):
            img = img.resize((w, h), Image.Resampling.LANCZOS)
        canvas.alpha_composite(img, (x, y))
    canvas.convert("RGB").save(OUTPUT_DIR / "home_main_lobby_composed_from_slices.png")


if __name__ == "__main__":
    generate_assets()
    compose_verification()
    print(f"source: {SRC_DIR}")
    print(f"generated: {OUT_DIR}")
    print(f"verification: {OUTPUT_DIR / 'home_main_lobby_composed_from_slices.png'}")

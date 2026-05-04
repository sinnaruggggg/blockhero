from __future__ import annotations

import json
import shutil
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "\uc774\ubbf8\uc9c0" / "UI" / "\uba54\uc778\ub85c\ube44"
USER_CUTOUT_DIR = SRC_DIR / "\ubc30\uacbd\uc81c\uac70"
OUT_DIR = ROOT / "src" / "assets" / "ui" / "home_split"
OUTPUT_DIR = ROOT / "output"

REFERENCE_SIZE = (862, 1824)
PRESS_DOWN_PX = 4
MAGENTA = np.array([255, 0, 255], dtype=np.int16)


SLOTS: dict[str, tuple[int, int]] = {
    "profile_card": (280, 103),
    "energy_pill": (200, 57),
    "gold_pill": (187, 55),
    "gem_pill": (164, 55),
    "settings_button": (86, 87),
    "logo": (365, 264),
    "side_event": (119, 137),
    "side_quest": (119, 137),
    "side_achievement": (119, 137),
    "side_mail": (119, 137),
    "side_shop": (118, 137),
    "side_pass": (118, 137),
    "side_friends": (118, 137),
    "play_panel": (816, 550),
    "primary_play": (714, 134),
    "mode_battle": (166, 219),
    "mode_raid": (166, 219),
    "mode_endless": (166, 219),
    "mode_ranking": (166, 219),
    "bottom_nav": (809, 145),
    "nav_home": (191, 140),
    "nav_bag": (202, 140),
    "nav_skill": (202, 140),
    "nav_codex": (206, 140),
}

HOME_REFERENCE_BOXES: dict[str, tuple[int, int, int, int]] = {
    "mode_battle": (53, 1362, 166, 219),
    "mode_raid": (247, 1362, 166, 219),
    "mode_endless": (441, 1362, 166, 219),
    "mode_ranking": (635, 1362, 166, 219),
}

SIDE_ROWS = [
    ("side_event", 12, 138),
    ("side_quest", 146, 138),
    ("side_achievement", 281, 138),
    ("side_mail", 414, 140),
    ("side_shop", 548, 140),
    ("side_pass", 681, 132),
    ("side_friends", 814, 125),
]
SIDE_COLS = {
    "normal": (96, 154),
    "pressed": (292, 154),
    "alert": (488, 154),
    "alertPressed": (684, 154),
}

TOP_CROPS = {
    "settings_button": {
        "normal": (1400, 300, 175, 175),
        "pressed": (1585, 300, 175, 175),
    },
    "logo": {
        "normal": (540, 445, 690, 430),
    },
}

PRIMARY_CROPS = {
    "normal": (960, 42, 590, 145),
    "pressed": (960, 203, 590, 145),
}

BOTTOM_NAV_CROPS = {
    "bottom_nav": {"normal": (345, 24, 1030, 215)},
    "nav_home": {
        "normal": (248, 276, 195, 145),
        "pressed": (248, 421, 195, 145),
        "alert": (248, 559, 195, 155),
        "alertPressed": (248, 707, 195, 155),
    },
    "nav_bag": {
        "normal": (592, 276, 205, 145),
        "pressed": (592, 421, 205, 145),
        "alert": (592, 559, 205, 155),
        "alertPressed": (592, 707, 205, 155),
    },
    "nav_skill": {
        "normal": (920, 276, 205, 145),
        "pressed": (920, 421, 205, 145),
        "alert": (920, 559, 205, 155),
        "alertPressed": (920, 707, 205, 155),
    },
    "nav_codex": {
        "normal": (1255, 276, 205, 145),
        "pressed": (1255, 421, 205, 145),
        "alert": (1255, 559, 205, 155),
        "alertPressed": (1255, 707, 205, 155),
    },
}

DYNAMIC_TEXT_RECTS = {
    "energy_pill": (50, 7, 144, 50),
    "gold_pill": (49, 7, 134, 48),
    "gem_pill": (50, 7, 112, 48),
}

MANIFEST_STATE_KEYS = {
    "profile_card": ("normal", "pressed"),
    "energy_pill": ("normal", "pressed"),
    "gold_pill": ("normal", "pressed"),
    "gem_pill": ("normal", "pressed"),
    "settings_button": ("normal", "pressed"),
    "logo": ("normal",),
    "side_event": ("normal", "pressed", "alert", "alertPressed"),
    "side_quest": ("normal", "pressed", "alert", "alertPressed"),
    "side_achievement": ("normal", "pressed", "alert", "alertPressed"),
    "side_mail": ("normal", "pressed", "alert", "alertPressed"),
    "side_shop": ("normal", "pressed", "alert", "alertPressed"),
    "side_pass": ("normal", "pressed", "alert", "alertPressed"),
    "side_friends": ("normal", "pressed", "alert", "alertPressed"),
    "primary_play": ("normal", "pressed"),
    "mode_battle": ("normal", "pressed", "alert", "alertPressed"),
    "mode_raid": ("normal", "pressed", "alert", "alertPressed"),
    "mode_endless": ("normal", "pressed", "alert", "alertPressed"),
    "mode_ranking": ("normal", "pressed", "alert", "alertPressed"),
    "nav_home": ("normal", "pressed", "alert", "alertPressed"),
    "nav_bag": ("normal", "pressed", "alert", "alertPressed"),
    "nav_skill": ("normal", "pressed", "alert", "alertPressed"),
    "nav_codex": ("normal", "pressed", "alert", "alertPressed"),
}


def crop(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    x, y, w, h = box
    return image.crop((x, y, x + w, y + h)).convert("RGBA")


def edge_connected(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        if mask[0, x]:
            q.append((0, x))
            visited[0, x] = True
        if mask[h - 1, x] and not visited[h - 1, x]:
            q.append((h - 1, x))
            visited[h - 1, x] = True
    for y in range(h):
        if mask[y, 0] and not visited[y, 0]:
            q.append((y, 0))
            visited[y, 0] = True
        if mask[y, w - 1] and not visited[y, w - 1]:
            q.append((y, w - 1))
            visited[y, w - 1] = True

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))
    return visited


def remove_edge_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    arr = np.array(rgba)
    rgb = arr[:, :, :3].astype(np.int16)
    diff = np.abs(rgb - MAGENTA).sum(axis=2)
    background = edge_connected(diff < 230)
    arr[background, 3] = 0
    return Image.fromarray(arr, "RGBA")


def trim_alpha(image: Image.Image, padding: int = 0) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    left, top, right, bottom = bbox
    return rgba.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(rgba.width, right + padding),
            min(rgba.height, bottom + padding),
        )
    )


def place_in_slot(
    image: Image.Image,
    slot: tuple[int, int],
    *,
    down: int = 0,
    trim_padding: int = 0,
) -> Image.Image:
    src = trim_alpha(image, padding=trim_padding)
    scale = min(slot[0] / src.width, max(1, slot[1] - down) / src.height)
    resized = src.resize(
        (max(1, round(src.width * scale)), max(1, round(src.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", slot, (0, 0, 0, 0))
    x = (slot[0] - resized.width) // 2
    y = (slot[1] - resized.height) // 2 + down
    canvas.alpha_composite(resized, (x, y))
    return canvas


def make_pressed_from_normal(image: Image.Image) -> Image.Image:
    dimmed = ImageEnhance.Brightness(image).enhance(0.82)
    dimmed = ImageEnhance.Contrast(dimmed).enhance(0.94)
    out = Image.new("RGBA", image.size, (0, 0, 0, 0))
    out.alpha_composite(dimmed, (0, PRESS_DOWN_PX))
    return out


def clear_dynamic_text(key: str, image: Image.Image) -> Image.Image:
    rect = DYNAMIC_TEXT_RECTS.get(key)
    if rect is None:
        return image
    out = image.copy()
    x0, y0, x1, y1 = rect
    patch_box = (max(0, x0 - 18), max(0, y0 - 8), min(out.width, x1 + 18), min(out.height, y1 + 8))
    patch = out.crop(patch_box).filter(ImageFilter.GaussianBlur(10))
    out.paste(patch.crop((x0 - patch_box[0], y0 - patch_box[1], x1 - patch_box[0], y1 - patch_box[1])), (x0, y0))
    return out


def save(key: str, state: str, image: Image.Image) -> None:
    suffix = "" if state == "normal" else f"_{state.replace('alertPressed', 'alert_pressed')}"
    image.save(OUT_DIR / f"{key}{suffix}.png")


def state_filename(key: str, state: str) -> str:
    suffix = "" if state == "normal" else f"_{state.replace('alertPressed', 'alert_pressed')}"
    return f"{key}{suffix}.png"


def use_user_event_cutout(state: str) -> Image.Image | None:
    mapping = {"normal": "1.png", "pressed": "11.png", "alert": "111.png", "alertPressed": "1111.png"}
    path = USER_CUTOUT_DIR / mapping[state]
    if not path.exists():
        return None
    return Image.open(path).convert("RGBA")


def generate_top_assets() -> None:
    sheet = Image.open(SRC_DIR / "01_top_hud_logo.png").convert("RGBA")
    for key, states in TOP_CROPS.items():
        for state, box in states.items():
            raw = remove_edge_magenta(crop(sheet, box))
            down = PRESS_DOWN_PX if state == "pressed" else 0
            out = place_in_slot(raw, SLOTS[key], down=down, trim_padding=1)
            out = clear_dynamic_text(key, out)
            save(key, state, out)


def generate_side_buttons() -> None:
    sheet = Image.open(SRC_DIR / "02_side_buttons.png").convert("RGBA")
    for key, y, h in SIDE_ROWS:
        for state, (x, w) in SIDE_COLS.items():
            source = use_user_event_cutout(state) if key == "side_event" else None
            raw = source if source is not None else remove_edge_magenta(crop(sheet, (x, y, w, h)))
            down = PRESS_DOWN_PX if state in {"pressed", "alertPressed"} else 0
            save(key, state, place_in_slot(raw, SLOTS[key], down=down, trim_padding=0))


def generate_primary_play() -> None:
    sheet = Image.open(SRC_DIR / "03_play_panel_modes.png").convert("RGBA")
    for state, box in PRIMARY_CROPS.items():
        raw = remove_edge_magenta(crop(sheet, box))
        down = PRESS_DOWN_PX if state == "pressed" else 0
        save("primary_play", state, place_in_slot(raw, SLOTS["primary_play"], down=down, trim_padding=1))


def make_round_rect_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def mask_mode_tile(image: Image.Image) -> Image.Image:
    out = image.convert("RGBA")
    mask = make_round_rect_mask(out.size, 24)
    out.putalpha(ImageChops.multiply(out.getchannel("A"), mask))
    return out


def badge_position(key: str, size: tuple[int, int], badge_size: tuple[int, int]) -> tuple[int, int]:
    if key.startswith("mode_"):
        return max(0, size[0] - badge_size[0] - 1), 0
    return max(0, size[0] - badge_size[0] - 1), 0


def remove_top_right_badge_art(image: Image.Image) -> Image.Image:
    """Repair source screenshots that already contain a partial notice badge."""
    out = image.convert("RGBA")
    patch = out.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    mask = Image.new("L", out.size, 0)
    draw = ImageDraw.Draw(mask)
    bx, by = max(0, out.width - 48), 0
    draw.ellipse((bx - 6, by - 6, out.width + 10, by + 52), fill=255)
    return Image.composite(patch, out, mask.filter(ImageFilter.GaussianBlur(1.2)))


def make_alert_badge() -> Image.Image:
    # Use the clean user-provided event alert badge area as the source of truth.
    source_path = USER_CUTOUT_DIR / "111.png"
    if source_path.exists():
        src = Image.open(source_path).convert("RGBA")
        bbox = src.getbbox()
        if bbox:
            src = src.crop(bbox)
        badge = src.crop((src.width - 45, 0, src.width, min(src.height, 45))).resize((42, 42), Image.Resampling.LANCZOS)
    else:
        side = Image.open(OUT_DIR / "side_event_alert.png").convert("RGBA")
        badge = side.crop((side.width - 45, 0, side.width, 45)).resize((42, 42), Image.Resampling.LANCZOS)
    alpha = Image.new("L", badge.size, 0)
    draw = ImageDraw.Draw(alpha)
    draw.ellipse((1, 1, 40, 40), fill=255)
    badge.putalpha(ImageChops.multiply(badge.getchannel("A"), alpha.filter(ImageFilter.GaussianBlur(0.35))))
    badge.save(OUT_DIR / "alert_badge.png")
    return badge


def generate_mode_buttons() -> None:
    reference = Image.open(SRC_DIR / "home_reference_full.png").convert("RGBA")
    badge = Image.open(OUT_DIR / "alert_badge.png").convert("RGBA")
    for key, box in HOME_REFERENCE_BOXES.items():
        x, y, w, h = box
        normal = mask_mode_tile(remove_top_right_badge_art(reference.crop((x, y, x + w, y + h))))
        save(key, "normal", normal)
        pressed = make_pressed_from_normal(normal)
        save(key, "pressed", pressed)
        alert = normal.copy()
        alert.alpha_composite(badge, badge_position(key, alert.size, badge.size))
        save(key, "alert", alert)
        alert_pressed = make_pressed_from_normal(alert)
        save(key, "alertPressed", alert_pressed)


def generate_bottom_nav() -> None:
    sheet = Image.open(SRC_DIR / "04_bottom_nav.png").convert("RGBA")
    bottom = place_in_slot(
        remove_edge_magenta(crop(sheet, BOTTOM_NAV_CROPS["bottom_nav"]["normal"])),
        SLOTS["bottom_nav"],
        trim_padding=1,
    )
    bottom.save(OUT_DIR / "bottom_nav.png")
    for key in ("nav_home", "nav_bag", "nav_skill", "nav_codex"):
        for state, box in BOTTOM_NAV_CROPS[key].items():
            raw = remove_edge_magenta(crop(sheet, box))
            down = PRESS_DOWN_PX if state in {"pressed", "alertPressed"} else 0
            save(key, state, place_in_slot(raw, SLOTS[key], down=down, trim_padding=1))


def copy_fixed_assets() -> None:
    shutil.copy2(SRC_DIR / "home_background_clean.png", OUT_DIR / "background_clean.png")


def write_manifest() -> None:
    states: dict[str, dict[str, str]] = {}
    for key, state_keys in MANIFEST_STATE_KEYS.items():
        if key == "profile_card":
            # The profile card contains the current app character/name art and is intentionally preserved.
            states[key] = {"normal": "profile_card.png", "pressed": "profile_card_pressed.png"}
            continue
        states[key] = {}
        for state in state_keys:
            states[key][state] = state_filename(key, state)
    states["play_panel"] = {"normal": "play_panel.png"}
    states["bottom_nav"] = {"normal": "bottom_nav.png"}
    manifest = {
        "source": str(SRC_DIR).replace("\\", "/"),
        "background": "background_clean.png",
        "states": states,
        "notes": [
            "Generated from main lobby sheet sources.",
            "Profile card art is preserved because the sheet source contains a placeholder silhouette.",
        ],
    }
    with (OUT_DIR / "home_split_manifest.json").open("w", encoding="utf-8") as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=2)


def create_state_preview() -> None:
    keys = [
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
    ]
    state_names = ("normal", "pressed", "alert", "alertPressed")
    cell_w, cell_h = 180, 180
    canvas = Image.new("RGBA", (cell_w * len(state_names), cell_h * len(keys)), (24, 24, 24, 255))
    for row, key in enumerate(keys):
        for col, state in enumerate(state_names):
            path = OUT_DIR / state_filename(key, state)
            img = Image.open(path).convert("RGBA")
            scale = min(140 / img.width, 130 / img.height)
            thumb = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.LANCZOS)
            x = col * cell_w + (cell_w - thumb.width) // 2
            y = row * cell_h + 14
            canvas.alpha_composite(thumb, (x, y))
            draw = ImageDraw.Draw(canvas)
            draw.text((col * cell_w + 8, row * cell_h + 156), f"{key} {state}", fill=(255, 255, 255, 255))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT_DIR / "main_lobby_ui_state_preview.png", quality=95)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    copy_fixed_assets()
    generate_top_assets()
    generate_side_buttons()
    make_alert_badge()
    generate_primary_play()
    generate_mode_buttons()
    generate_bottom_nav()
    write_manifest()
    create_state_preview()
    print(f"generated: {OUT_DIR}")
    print(f"preview: {OUTPUT_DIR / 'main_lobby_ui_state_preview.png'}")


if __name__ == "__main__":
    main()

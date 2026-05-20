"""
Placeholder asset generator for the Patient and Doctor mobile apps.

These are NOT final brand assets — they exist so:
  - The app at least has the required PNG files at the correct
    dimensions so `eas build` won't fail.
  - Internal TestFlight / closed-track builds look identifiable.
  - Screenshots and the "OD" monogram are recognisable.

Replace with real designer artwork before App Store / Play submission.
Specs are documented in apps/patient/src/assets/README.md and
apps/doctor/src/assets/README.md.

Run:
    python apps/generate-placeholder-assets.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def gradient(size, colors):
    """Vertical gradient between an arbitrary list of #RRGGBB colours."""
    w, h = size
    img = Image.new("RGB", size, colors[0])
    px = img.load()
    n = len(colors) - 1
    for y in range(h):
        # which segment of the gradient
        t = (y / max(h - 1, 1)) * n
        seg = int(t)
        seg = min(seg, n - 1)
        local = t - seg
        c0 = tuple(int(colors[seg][i : i + 2], 16) for i in (1, 3, 5))
        c1 = tuple(int(colors[seg + 1][i : i + 2], 16) for i in (1, 3, 5))
        r = int(c0[0] + (c1[0] - c0[0]) * local)
        g = int(c0[1] + (c1[1] - c0[1]) * local)
        b = int(c0[2] + (c1[2] - c0[2]) * local)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def load_font(size):
    """Try a few common system fonts; fall back to PIL default."""
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",  # Segoe UI Bold (Windows)
        "C:/Windows/Fonts/arialbd.ttf",  # Arial Bold (Windows)
        "/System/Library/Fonts/Helvetica.ttc",  # macOS
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_monogram(img, text, color="#ffffff", size_ratio=0.45):
    """Centre a bold monogram on the image."""
    w, h = img.size
    font_size = int(min(w, h) * size_ratio)
    font = load_font(font_size)
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (w - tw) // 2 - bbox[0]
    y = (h - th) // 2 - bbox[1]
    draw.text((x, y), text, fill=color, font=font)


def draw_cross(img, color="#ffffff", arm_thickness_ratio=0.22, arm_length_ratio=0.625, corner_radius_ratio=0.08):
    """Draw the canonical OduDoc medical-cross icon centred in the image.

    Proportions mirror components/Logo.tsx (12:40 over a 64-unit square,
    rounded corners 5/64). Two crossing rounded rectangles with white
    fill, drawn as overlay so the underlying gradient shows through the
    background.
    """
    w, h = img.size
    s = min(w, h)
    thick = int(s * arm_thickness_ratio)
    length = int(s * arm_length_ratio)
    radius = max(4, int(s * corner_radius_ratio))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = w // 2, h // 2
    # Vertical bar
    draw.rounded_rectangle(
        [cx - thick // 2, cy - length // 2, cx + thick // 2, cy + length // 2],
        radius=radius,
        fill=color,
    )
    # Horizontal bar
    draw.rounded_rectangle(
        [cx - length // 2, cy - thick // 2, cx + length // 2, cy + thick // 2],
        radius=radius,
        fill=color,
    )


def write_icon(path, gradient_colors, monogram, badge=None, badge_color="#ffffff"):
    """1024x1024 opaque icon — canonical OduDoc cross over role gradient."""
    img = gradient((1024, 1024), gradient_colors)
    # Cross icon is the brand mark — matches components/Logo.tsx.
    draw_cross(img)

    if badge:
        # Bottom-right pill with role label (e.g. "Dr" for the Doctor app)
        d = ImageDraw.Draw(img, "RGBA")
        bw, bh = 280, 110
        bx, by = 1024 - bw - 60, 1024 - bh - 60
        d.rounded_rectangle(
            [bx, by, bx + bw, by + bh], radius=55, fill=(255, 255, 255, 230)
        )
        font = load_font(64)
        text_color = tuple(int(badge_color[i : i + 2], 16) for i in (1, 3, 5))
        bbox = d.textbbox((0, 0), badge, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        d.text(
            (bx + (bw - tw) // 2 - bbox[0], by + (bh - th) // 2 - bbox[1]),
            badge,
            fill=text_color,
            font=font,
        )

    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path}")


def write_adaptive_icon(path, gradient_colors, monogram):
    """1024x1024 transparent foreground for Android adaptive icon.

    Android crops the inner safe zone (~66% of total) — keep the cross
    well inside it so the icon doesn't get its arms clipped on launchers
    that prefer circular masks.
    """
    img = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    overlay = gradient((680, 680), gradient_colors).convert("RGBA")
    mask = Image.new("L", (680, 680), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 680, 680], radius=180, fill=255)
    overlay.putalpha(mask)
    img.paste(overlay, ((1024 - 680) // 2, (1024 - 680) // 2), overlay)
    # Cross sized for the inner overlay (≈ 60% of 680px).
    draw_cross(img, arm_thickness_ratio=0.145, arm_length_ratio=0.41)
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path}")


def write_splash(path, gradient_colors, monogram):
    """1284x2778 iPhone 14 Pro Max sized splash."""
    img = gradient((1284, 2778), gradient_colors)
    # Cross sits in the upper third — leaves room for the wordmark
    # below without crowding.
    draw_cross(img, arm_thickness_ratio=0.11, arm_length_ratio=0.30)
    # Wordmark below the cross.
    font = load_font(120)
    draw = ImageDraw.Draw(img)
    label = "OduDoc"
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        ((1284 - tw) // 2 - bbox[0], 1700),
        label,
        fill="#ffffff",
        font=font,
    )
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path}")


def write_favicon(path, gradient_colors, monogram):
    """48x48 favicon used by Expo Web preview builds."""
    img = gradient((48, 48), gradient_colors)
    draw_cross(img, arm_thickness_ratio=0.28, arm_length_ratio=0.72)
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path}")


# Both apps use the canonical OduDoc gradient — emerald → teal → deep
# navy, matching components/Logo.tsx, public/images/logo.svg, and the
# new opengraph-image.tsx. Brand identity > role colour on store icons;
# the role-themed UI lives inside the app via apps/_shared/theme.ts.
# The Doctor variant gets a "Dr" badge so it's still distinguishable on
# the user's home screen.
BRAND_GRADIENT = ["#22C98A", "#0EA5A0", "#0F3570"]

# ── Patient app ────────────────────────────────────────────────────
patient_dir = os.path.join(HERE, "patient", "src", "assets")
os.makedirs(patient_dir, exist_ok=True)

print("Patient app:")
write_icon(os.path.join(patient_dir, "icon.png"), BRAND_GRADIENT, "Od")
write_adaptive_icon(
    os.path.join(patient_dir, "adaptive-icon.png"), BRAND_GRADIENT, "Od"
)
write_splash(os.path.join(patient_dir, "splash.png"), BRAND_GRADIENT, "OduDoc")
write_favicon(os.path.join(patient_dir, "favicon.png"), BRAND_GRADIENT, "O")

# ── Doctor app — same brand gradient + "Dr" badge ─────────────────
doctor_dir = os.path.join(HERE, "doctor", "src", "assets")
os.makedirs(doctor_dir, exist_ok=True)

print("Doctor app:")
write_icon(
    os.path.join(doctor_dir, "icon.png"),
    BRAND_GRADIENT,
    "Od",
    badge="Dr",
    badge_color="#0EA5A0",
)
write_adaptive_icon(
    os.path.join(doctor_dir, "adaptive-icon.png"), BRAND_GRADIENT, "Od"
)
write_splash(os.path.join(doctor_dir, "splash.png"), BRAND_GRADIENT, "OduDoc Dr")
write_favicon(os.path.join(doctor_dir, "favicon.png"), BRAND_GRADIENT, "D")

print("\nDone. These are PLACEHOLDERS — replace with designer artwork")
print("before App Store / Play Store submission.")

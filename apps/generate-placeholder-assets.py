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


def write_icon(path, gradient_colors, monogram, badge=None, badge_color="#ffffff"):
    """1024x1024 opaque icon."""
    img = gradient((1024, 1024), gradient_colors)
    draw_monogram(img, monogram, size_ratio=0.42)

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
    """1024x1024 transparent foreground for Android adaptive icon."""
    img = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    # Draw a smaller rounded square so safe-zone clipping looks intentional
    overlay = gradient((680, 680), gradient_colors).convert("RGBA")
    mask = Image.new("L", (680, 680), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 680, 680], radius=180, fill=255)
    overlay.putalpha(mask)
    img.paste(overlay, ((1024 - 680) // 2, (1024 - 680) // 2), overlay)
    draw_monogram(img, monogram, size_ratio=0.32)
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path}")


def write_splash(path, gradient_colors, monogram):
    """1284x2778 iPhone 14 Pro Max sized splash."""
    img = gradient((1284, 2778), gradient_colors)
    draw_monogram(img, monogram, size_ratio=0.30)
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path}")


def write_favicon(path, gradient_colors, monogram):
    """48x48 favicon used by Expo Web preview builds."""
    img = gradient((48, 48), gradient_colors)
    draw_monogram(img, monogram, size_ratio=0.55)
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path}")


# ── Patient app: teal / emerald / cyan ─────────────────────────────
patient_dir = os.path.join(HERE, "patient", "src", "assets")
os.makedirs(patient_dir, exist_ok=True)
patient_gradient = ["#34d399", "#14b8a6", "#06b6d4"]

print("Patient app:")
write_icon(os.path.join(patient_dir, "icon.png"), patient_gradient, "Od")
write_adaptive_icon(
    os.path.join(patient_dir, "adaptive-icon.png"), patient_gradient, "Od"
)
write_splash(os.path.join(patient_dir, "splash.png"), patient_gradient, "OduDoc")
write_favicon(os.path.join(patient_dir, "favicon.png"), patient_gradient, "O")

# ── Doctor app: violet / fuchsia / indigo ──────────────────────────
doctor_dir = os.path.join(HERE, "doctor", "src", "assets")
os.makedirs(doctor_dir, exist_ok=True)
doctor_gradient = ["#a78bfa", "#c084fc", "#6366f1"]

print("Doctor app:")
write_icon(
    os.path.join(doctor_dir, "icon.png"),
    doctor_gradient,
    "Od",
    badge="Dr",
    badge_color="#7c3aed",
)
write_adaptive_icon(
    os.path.join(doctor_dir, "adaptive-icon.png"), doctor_gradient, "Od"
)
write_splash(os.path.join(doctor_dir, "splash.png"), doctor_gradient, "OduDoc Dr")
write_favicon(os.path.join(doctor_dir, "favicon.png"), doctor_gradient, "D")

print("\nDone. These are PLACEHOLDERS — replace with designer artwork")
print("before App Store / Play Store submission.")

import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def draw_tapered_orbit(draw, center_x, center_y, a, b, tilt_deg, start_deg, end_deg, color, max_w, min_w):
    tilt = math.radians(tilt_deg)
    cos_t = math.cos(tilt)
    sin_t = math.sin(tilt)
    
    total_degs = end_deg - start_deg
    step = 1
    for d in range(start_deg, end_deg, step):
        t = (d - start_deg) / total_degs
        # Sine taper or linear taper
        w = min_w + (max_w - min_w) * math.sin(t * math.pi)
        
        r1 = math.radians(d)
        r2 = math.radians(d + step)
        
        x1 = center_x + (a * math.cos(r1)) * cos_t - (b * math.sin(r1)) * sin_t
        y1 = center_y + (a * math.cos(r1)) * sin_t + (b * math.sin(r1)) * cos_t
        
        x2 = center_x + (a * math.cos(r2)) * cos_t - (b * math.sin(r2)) * sin_t
        y2 = center_y + (a * math.cos(r2)) * sin_t + (b * math.sin(r2)) * cos_t
        
        draw.line([(x1, y1), (x2, y2)], fill=color, width=max(1, int(w)))

def render_scrit_refined(variant="scrit_gold_orbit", cap_s=True):
    width = 4400
    height = 600
    scale = 2
    sw, sh = width * scale, height * scale
    
    font_path = "scratch/fonts/Unbounded-Bold.ttf"
    font_size = 310 * scale
    font = ImageFont.truetype(font_path, font_size)
    
    # Letters
    first_letter = "S" if cap_s else "s"
    crit_letters = ["C", "R", "I", "T"]
    all_letters = [first_letter] + crit_letters
    
    bboxes = [font.getbbox(ch) for ch in all_letters]
    widths = [bb[2] - bb[0] for bb in bboxes]
    
    letter_spacing = int(140 * scale)
    total_text_w = sum(widths) + (len(all_letters) - 1) * letter_spacing
    
    start_x = (sw - total_text_w) // 2
    baseline_y = int(420 * scale)
    
    # Layer 1: Back elements (back of orbit)
    back_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(back_img)
    
    # Layer 2: Main text
    text_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(text_img)
    
    # Layer 3: Front elements (front of orbit + particle)
    front_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    f_draw = ImageDraw.Draw(front_img)
    
    # Position of first letter
    s_x = start_x
    s_w = widths[0]
    s_bb = bboxes[0]
    s_h = s_bb[3] - s_bb[1]
    
    # Orbit geometry around first letter
    cx = s_x + s_w // 2
    cy = baseline_y - s_h // 2 - int(10 * scale)
    a = int(s_w * 0.95)
    b = int(s_h * 0.28)
    tilt = -24
    
    # Colors
    gold_main = (240, 185, 45, 255) # 24K Gold
    gold_light = (255, 230, 120, 255)
    gold_glow = (250, 200, 60, 255)
    white_main = (255, 255, 255, 255)
    white_dim = (235, 238, 242, 255)
    
    # Back orbit (160 deg to 360 deg)
    draw_tapered_orbit(b_draw, cx, cy, a, b, tilt, 155, 360, gold_main, max_w=24*scale, min_w=6*scale)
    
    # Render letters with subtle 3D metallic top-to-bottom shading
    curr_x = start_x
    for i, ch in enumerate(all_letters):
        # Position
        pos = (curr_x, baseline_y - int(font_size * 0.88))
        
        # Color: if variant is gold_s and i==0, gold. Otherwise white.
        if i == 0 and "gold_s" in variant:
            t_draw.text(pos, ch, font=font, fill=gold_main)
        else:
            t_draw.text(pos, ch, font=font, fill=white_main)
            
        curr_x += widths[i] + letter_spacing
        
    # Front orbit (0 deg to 180 deg)
    draw_tapered_orbit(f_draw, cx, cy, a, b, tilt, 0, 185, gold_main, max_w=24*scale, min_w=6*scale)
    
    # Add satellite particle on front orbit at 40 degrees
    sat_rad = math.radians(40)
    t_rad = math.radians(tilt)
    ex = a * math.cos(sat_rad)
    ey = b * math.sin(sat_rad)
    sat_x = cx + ex * math.cos(t_rad) - ey * math.sin(t_rad)
    sat_y = cy + ex * math.sin(t_rad) + ey * math.cos(t_rad)
    
    # Orbiting assay diamond / sphere
    sr = int(32 * scale)
    f_draw.ellipse([sat_x - sr, sat_y - sr, sat_x + sr, sat_y + sr], fill=gold_main)
    # Bright center core
    f_draw.ellipse([sat_x - sr*0.55, sat_y - sr*0.55, sat_x + sr*0.55, sat_y + sr*0.55], fill=white_main)
    
    # Composite all layers: Back + Text + Front
    artwork = Image.alpha_composite(back_img, text_img)
    artwork = Image.alpha_composite(artwork, front_img)
    
    # Downsample supersampled artwork with high-quality Lanczos
    downsampled = artwork.resize((width, height), Image.Resampling.LANCZOS)
    
    # Realistic soft ambient drop-shadow (just like artemis logo)
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    alpha = downsampled.split()[3]
    black_shape = Image.new("RGBA", (width, height), (0, 0, 0, 180))
    shadow.paste(black_shape, mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=16))
    
    shadow_offset = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_offset.paste(shadow, (0, 8))
    
    final_composite = Image.alpha_composite(shadow_offset, downsampled)
    
    # Crop tightly with breathing room
    bbox = final_composite.getbbox()
    pad = 24
    crop_box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(width, bbox[2] + pad), min(height, bbox[3] + pad))
    cropped = final_composite.crop(crop_box)
    
    # Save transparent outputs
    prefix = f"{variant}_{'caps' if cap_s else 'lowers'}"
    cropped.save(f"public/assets/png/{prefix}.png", "PNG")
    cropped.save(f"public/assets/{prefix}.webp", "WEBP", quality=95)
    
    # Save dark preview matching kentir navbar
    dark_bg = Image.new("RGBA", cropped.size, (19, 20, 22, 255))
    dark_preview = Image.alpha_composite(dark_bg, cropped)
    dark_preview.save(f"public/assets/png/{prefix}-dark-preview.png", "PNG")
    
    print(f"Generated {prefix}: size {cropped.size}")

if __name__ == "__main__":
    # Test 1: White S with Gold Orbit (like Artemis where A is white with green orbit)
    render_scrit_refined("scrit_white_orbit", cap_s=True)
    # Test 2: White lowercase s with Gold Orbit
    render_scrit_refined("scrit_white_orbit", cap_s=False)
    # Test 3: Gold S with Gold Orbit
    render_scrit_refined("scrit_gold_s_orbit", cap_s=True)
    # Test 4: Gold lowercase s with Gold Orbit
    render_scrit_refined("scrit_gold_s_orbit", cap_s=False)

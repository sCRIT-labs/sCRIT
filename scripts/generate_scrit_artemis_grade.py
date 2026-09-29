import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_smooth_orbit_layer(sw, sh, cx, cy, a, b, tilt_deg, gold_color, white_core, scale):
    """
    Renders a silky smooth 3D orbital ring split into back and front halves with a satellite particle.
    """
    back_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    front_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    
    b_draw = ImageDraw.Draw(back_img)
    f_draw = ImageDraw.Draw(front_img)
    
    tilt = math.radians(tilt_deg)
    cos_t = math.cos(tilt)
    sin_t = math.sin(tilt)
    
    # We construct smooth filled polygon ribbons for back and front
    def get_orbit_points(start_deg, end_deg, max_w, min_w):
        outer_pts = []
        inner_pts = []
        total_deg = end_deg - start_deg
        
        # High resolution sampling (0.5 degree steps)
        steps = int(total_deg * 2)
        for i in range(steps + 1):
            d = start_deg + (i / steps) * total_deg
            rad = math.radians(d)
            
            # Tapered thickness: reaches max_w at center, min_w at edges
            t = (d - start_deg) / total_deg
            # Taper shape
            w = min_w + (max_w - min_w) * math.sin(t * math.pi)
            
            # Base ellipse
            ex = a * math.cos(rad)
            ey = b * math.sin(rad)
            
            # Normal vector in local ellipse coordinates
            # Derivative is (-a*sin, b*cos)
            dx = -a * math.sin(rad)
            dy = b * math.cos(rad)
            length = math.sqrt(dx*dx + dy*dy)
            if length == 0:
                nx, ny = 0, 1
            else:
                nx = -dy / length
                ny = dx / length
                
            # Outer point
            ox = ex + nx * (w / 2.0)
            oy = ey + ny * (w / 2.0)
            
            # Inner point
            ix = ex - nx * (w / 2.0)
            iy = ey - ny * (w / 2.0)
            
            # Rotate to world
            rot_ox = cx + ox * cos_t - oy * sin_t
            rot_oy = cy + ox * sin_t + oy * cos_t
            rot_ix = cx + ix * cos_t - iy * sin_t
            rot_iy = cy + ix * sin_t + iy * cos_t
            
            outer_pts.append((rot_ox, rot_oy))
            inner_pts.append((rot_ix, rot_iy))
            
        return outer_pts + list(reversed(inner_pts))

    # Back half: 155 to 365 degrees
    back_poly = get_orbit_points(155, 365, max_w=22*scale, min_w=7*scale)
    b_draw.polygon(back_poly, fill=gold_color)
    
    # Front half: -5 to 185 degrees
    front_poly = get_orbit_points(-5, 185, max_w=22*scale, min_w=7*scale)
    f_draw.polygon(front_poly, fill=gold_color)
    
    # Orbiting Assay Satellite (Diamond/Sphere) on the front ring at 38 degrees
    sat_rad = math.radians(38)
    ex = a * math.cos(sat_rad)
    ey = b * math.sin(sat_rad)
    sat_x = cx + ex * cos_t - ey * sin_t
    sat_y = cy + ex * sin_t + ey * cos_t
    
    sr = int(32 * scale)
    # Gold outer halo
    f_draw.ellipse([sat_x - sr, sat_y - sr, sat_x + sr, sat_y + sr], fill=gold_color)
    # Bright white core
    f_draw.ellipse([sat_x - sr*0.55, sat_y - sr*0.55, sat_x + sr*0.55, sat_y + sr*0.55], fill=white_core)
    
    return back_img, front_img

def render_scrit_logo_artemis_grade(
    mode="caps", # "caps" (S CRIT) or "lowers" (s CRIT) or "hex" (HEX sCRIT)
    output_filename="scrit_brand_logo"
):
    # Dimensions: 4400 x 560 (wide aspect ratio ~8:1)
    width = 4400
    height = 560
    scale = 4 # 4x supersampling for flawless antialiasing
    sw, sh = width * scale, height * scale
    
    font_path = "scratch/fonts/Unbounded-Bold.ttf"
    font_size = 300 * scale
    font = ImageFont.truetype(font_path, font_size)
    
    crit_letters = ["C", "R", "I", "T"]
    crit_bboxes = [font.getbbox(ch) for ch in crit_letters]
    crit_widths = [bb[2] - bb[0] for bb in crit_bboxes]
    
    letter_spacing = int(140 * scale)
    baseline_y = int(410 * scale)
    
    gold_color = (242, 186, 42, 255) # 24K Pure Assay Gold
    white_color = (255, 255, 255, 255)
    
    super_canvas = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    
    if mode in ["caps", "lowers"]:
        first_char = "S" if mode == "caps" else "s"
        s_bb = font.getbbox(first_char)
        s_w = s_bb[2] - s_bb[0]
        s_h = s_bb[3] - s_bb[1]
        
        all_widths = [s_w] + crit_widths
        total_w = sum(all_widths) + (len(all_widths) - 1) * letter_spacing
        start_x = (sw - total_w) // 2
        
        # Center for the orbital ring
        cx = start_x + s_w // 2
        cy = baseline_y - s_h // 2 - int(8 * scale)
        a = int(s_w * 0.98)
        b = int(s_h * 0.28)
        tilt = -23
        
        # Generate smooth orbit layers
        back_orbit, front_orbit = create_smooth_orbit_layer(sw, sh, cx, cy, a, b, tilt, gold_color, white_color, scale)
        
        # Text layer
        text_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        t_draw = ImageDraw.Draw(text_layer)
        
        # Draw first letter
        t_draw.text((start_x, baseline_y - int(font_size * 0.88)), first_char, font=font, fill=white_color)
        
        # Draw CRIT
        curr_x = start_x + s_w + letter_spacing
        for ch, w in zip(crit_letters, crit_widths):
            t_draw.text((curr_x, baseline_y - int(font_size * 0.88)), ch, font=font, fill=white_color)
            curr_x += w + letter_spacing
            
        # Composite: Back Orbit + Text + Front Orbit
        super_canvas = Image.alpha_composite(super_canvas, back_orbit)
        super_canvas = Image.alpha_composite(super_canvas, text_layer)
        super_canvas = Image.alpha_composite(super_canvas, front_orbit)
        
    elif mode == "hex":
        # Hex-Vault & Assay Diamond + sCRIT
        s_bb = font.getbbox("s")
        s_w = s_bb[2] - s_bb[0]
        all_widths = [s_w] + crit_widths
        
        mark_size = int(320 * scale)
        gap = int(120 * scale)
        total_w = mark_size + gap + sum(all_widths) + (len(all_widths) - 1) * letter_spacing
        start_x = (sw - total_w) // 2
        
        # Draw isometric Hex-Vault mark
        cx = start_x + mark_size // 2
        cy = baseline_y - int(font_size * 0.42)
        r = mark_size * 0.46
        
        mark_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        m_draw = ImageDraw.Draw(mark_layer)
        
        hex_pts = []
        for i in range(6):
            ang = math.radians(30 + i * 60)
            hex_pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
            
        # Upper facet (Titanium)
        m_draw.polygon([hex_pts[0], hex_pts[1], (cx, cy)], fill=(255, 255, 255, 255))
        m_draw.polygon([hex_pts[1], hex_pts[2], (cx, cy)], fill=(225, 230, 235, 255))
        
        # Lower facet (24K Gold)
        m_draw.polygon([hex_pts[3], hex_pts[4], (cx, cy)], fill=gold_color)
        m_draw.polygon([hex_pts[4], hex_pts[5], (cx, cy)], fill=(195, 145, 30, 255))
        
        # Diamond gem center
        dr = r * 0.42
        gem_pts = [(cx, cy - dr), (cx + dr*0.7, cy), (cx, cy + dr), (cx - dr*0.7, cy)]
        m_draw.polygon(gem_pts, fill=(255, 255, 255, 255), outline=gold_color, width=int(3*scale))
        
        # Text layer
        text_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        t_draw = ImageDraw.Draw(text_layer)
        
        curr_x = start_x + mark_size + gap
        # 's' in gold
        t_draw.text((curr_x, baseline_y - int(font_size * 0.88)), "s", font=font, fill=gold_color)
        curr_x += s_w + letter_spacing
        
        # 'CRIT' in white
        for ch, w in zip(crit_letters, crit_widths):
            t_draw.text((curr_x, baseline_y - int(font_size * 0.88)), ch, font=font, fill=white_color)
            curr_x += w + letter_spacing
            
        super_canvas = Image.alpha_composite(mark_layer, text_layer)
        
    # Downscale with high-quality Lanczos resampling
    downsampled = super_canvas.resize((width, height), Image.Resampling.LANCZOS)
    
    # Apply soft ambient drop-shadow (identical to kentir's artemis logo)
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    alpha = downsampled.split()[3]
    black_shape = Image.new("RGBA", (width, height), (0, 0, 0, 190))
    shadow.paste(black_shape, mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=15))
    
    shadow_offset = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_offset.paste(shadow, (0, 7))
    
    final_composite = Image.alpha_composite(shadow_offset, downsampled)
    
    # Crop tightly with balanced padding
    bbox = final_composite.getbbox()
    pad = 28
    crop_box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(width, bbox[2] + pad), min(height, bbox[3] + pad))
    cropped = final_composite.crop(crop_box)
    
    os.makedirs("public/assets/png", exist_ok=True)
    
    # Save transparent PNG and WebP
    cropped.save(f"public/assets/png/{output_filename}.png", "PNG")
    cropped.save(f"public/assets/{output_filename}.webp", "WEBP", quality=98)
    
    # Save Dark-Preview (on #131416 background matching kentir's navbar)
    dark_bg = Image.new("RGBA", cropped.size, (19, 20, 22, 255))
    dark_preview = Image.alpha_composite(dark_bg, cropped)
    dark_preview.save(f"public/assets/png/{output_filename}-dark-preview.png", "PNG")
    
    print(f"Generated {output_filename}: {cropped.size}")

if __name__ == "__main__":
    # Option 1: Artemis-identical kinetic S CRIT (All-caps balanced height with gold orbit)
    render_scrit_logo_artemis_grade("caps", "scrit-logo-artemis-caps")
    
    # Option 2: Lowercase s CRIT with gold orbit
    render_scrit_logo_artemis_grade("lowers", "scrit-logo-artemis-lowers")
    
    # Option 3: Hex-Vault Monogram + sCRIT
    render_scrit_logo_artemis_grade("hex", "scrit-logo-hex-wordmark")

import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_scrit_horizontal_logo(
    variant="orbital", # "orbital" or "hex_monogram"
    out_prefix="scrit-logo-horizontal"
):
    # Dimensions matching kentir's artemis logo (4500 x 550)
    width = 3800
    height = 550
    
    # 1. Base canvas
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font_path = "scratch/fonts/Unbounded-Bold.ttf"
    font_size = 320
    font = ImageFont.truetype(font_path, font_size)
    
    # Calculate layout
    # Text: "C", "R", "I", "T"
    crit_letters = ["C", "R", "I", "T"]
    crit_bboxes = [font.getbbox(ch) for ch in crit_letters]
    crit_widths = [bb[2] - bb[0] for bb in crit_bboxes]
    
    # Spacing between letters (tracking)
    letter_spacing = 130
    
    # Target baseline y
    baseline_y = 390
    
    if variant == "orbital":
        # First letter: 's' (lowercase) or stylized 'S'
        s_char = "s"
        s_bb = font.getbbox(s_char)
        s_w = s_bb[2] - s_bb[0]
        s_h = s_bb[3] - s_bb[1]
        
        # Total text block width
        total_w = s_w + 160 + sum(crit_widths) + (len(crit_letters) - 1) * letter_spacing
        start_x = (width - total_w) // 2
        
        # Layer 1: Back half of the orbital ring (drawn behind 's')
        ring_center_x = start_x + s_w // 2 + 10
        ring_center_y = baseline_y - s_h // 2 - 10
        
        # We render ring and letters on separate high-res layers with supersampling
        scale = 2
        sw = width * scale
        sh = height * scale
        super_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(super_img)
        s_font = ImageFont.truetype(font_path, font_size * scale)
        
        sc_x = start_x * scale
        sc_base_y = baseline_y * scale
        sc_let_sp = letter_spacing * scale
        
        # Ellipse parameters for orbital ring
        # Angle: -22 degrees, semi-major a=280*scale, semi-minor b=65*scale
        rx = ring_center_x * scale
        ry = ring_center_y * scale
        a = 270 * scale
        b = 68 * scale
        tilt = -math.radians(24)
        cos_t = math.cos(tilt)
        sin_t = math.sin(tilt)
        
        # Draw back half of orbit (from angle math.pi to 2*math.pi)
        back_points = []
        for deg in range(160, 360, 2):
            rad = math.radians(deg)
            ex = a * math.cos(rad)
            ey = b * math.sin(rad)
            rot_x = rx + ex * cos_t - ey * sin_t
            rot_y = ry + ex * sin_t + ey * cos_t
            back_points.append((rot_x, rot_y))
            
        ring_color = (230, 180, 50, 255) # 24K Assay Gold
        ring_glow = (245, 205, 80, 255)
        
        # Back ring stroke
        for i in range(len(back_points) - 1):
            s_draw.line([back_points[i], back_points[i+1]], fill=ring_color, width=11 * scale)
            
        # Draw letter 's'
        # In Artemis, 'A' is white with the colored ring.
        # Let's make 's' pure platinum white with subtle gold inner tint or pure white!
        s_pos = (sc_x, sc_base_y - (s_bb[3] - s_bb[1]) * scale - 20)
        s_draw.text((sc_x, sc_base_y - font_size * scale * 0.88), "s", font=s_font, fill=(255, 255, 255, 255))
        
        # Draw front half of orbit (loops in front of 's')
        front_points = []
        for deg in range(0, 185, 2):
            rad = math.radians(deg)
            ex = a * math.cos(rad)
            ey = b * math.sin(rad)
            rot_x = rx + ex * cos_t - ey * sin_t
            rot_y = ry + ex * sin_t + ey * cos_t
            front_points.append((rot_x, rot_y))
            
        for i in range(len(front_points) - 1):
            s_draw.line([front_points[i], front_points[i+1]], fill=ring_color, width=11 * scale)
            
        # Orbiting satellite particle (kinetic assay sphere on the front ring)
        sat_rad = math.radians(45)
        sat_ex = a * math.cos(sat_rad)
        sat_ey = b * math.sin(sat_rad)
        sat_x = rx + sat_ex * cos_t - sat_ey * sin_t
        sat_y = ry + sat_ex * sin_t + sat_ey * cos_t
        sat_r = 24 * scale
        s_draw.ellipse([sat_x - sat_r, sat_y - sat_r, sat_x + sat_r, sat_y + sat_r], fill=(255, 225, 90, 255))
        # Particle inner highlight
        s_draw.ellipse([sat_x - sat_r*0.5, sat_y - sat_r*0.5, sat_x + sat_r*0.5, sat_y + sat_r*0.5], fill=(255, 255, 255, 255))
        
        # Now draw C, R, I, T
        curr_x = sc_x + (s_w * scale) + 160 * scale
        for ch, w in zip(crit_letters, crit_widths):
            s_draw.text((curr_x, sc_base_y - font_size * scale * 0.88), ch, font=s_font, fill=(255, 255, 255, 255))
            curr_x += (w * scale) + sc_let_sp
            
        # Downscale with antialiasing
        final_rgb = super_img.resize((width, height), Image.Resampling.LANCZOS)
        
    elif variant == "hex_monogram":
        # Draw Hex-Vault & Assay Diamond as the leading mark, followed by CRIT or sCRIT
        scale = 2
        sw = width * scale
        sh = height * scale
        super_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(super_img)
        s_font = ImageFont.truetype(font_path, font_size * scale)
        
        mark_size = int(340 * scale)
        total_w = mark_size + 140 * scale + sum(crit_widths) * scale + (len(crit_letters) - 1) * letter_spacing * scale
        sc_x = (sw - total_w) // 2
        sc_base_y = baseline_y * scale
        
        # Draw the isometric Hex-Vault mark
        cx = sc_x + mark_size // 2
        cy = sc_base_y - int(font_size * scale * 0.42)
        r = mark_size * 0.46
        
        # Hexagon vertices
        hex_pts = []
        for i in range(6):
            ang = math.radians(30 + i * 60)
            hex_pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
            
        # Gold & White interlocking facets
        gold_color = (217, 169, 46, 255)
        white_color = (255, 255, 255, 255)
        
        # Outer ring
        s_draw.polygon(hex_pts, outline=(255, 255, 255, 60), width=int(3 * scale))
        
        # Upper facet (Titanium)
        s_draw.polygon([hex_pts[0], hex_pts[1], (cx, cy)], fill=white_color)
        s_draw.polygon([hex_pts[1], hex_pts[2], (cx, cy)], fill=(220, 225, 230, 255))
        
        # Lower facet (24K Gold)
        s_draw.polygon([hex_pts[3], hex_pts[4], (cx, cy)], fill=gold_color)
        s_draw.polygon([hex_pts[4], hex_pts[5], (cx, cy)], fill=(185, 140, 30, 255))
        
        # Center Assay Gem
        diamond_pts = [(cx, cy - r*0.45), (cx + r*0.35, cy), (cx, cy + r*0.45), (cx - r*0.35, cy)]
        s_draw.polygon(diamond_pts, fill=(255, 255, 255, 255), outline=gold_color, width=int(2*scale))
        
        # Draw "s" in gold
        curr_x = sc_x + mark_size + 140 * scale
        s_draw.text((curr_x, sc_base_y - font_size * scale * 0.88), "s", font=s_font, fill=gold_color)
        s_bb = font.getbbox("s")
        curr_x += (s_bb[2] - s_bb[0]) * scale + letter_spacing * scale
        
        # Draw "CRIT"
        for ch, w in zip(crit_letters, crit_widths):
            s_draw.text((curr_x, sc_base_y - font_size * scale * 0.88), ch, font=s_font, fill=white_color)
            curr_x += (w * scale) + letter_spacing * scale
            
        final_rgb = super_img.resize((width, height), Image.Resampling.LANCZOS)
        
    # Generate realistic ambient drop-shadow (just like artemis logo)
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    # Extract alpha from final_rgb
    alpha_mask = final_rgb.split()[3]
    # Tint black
    black_shape = Image.new("RGBA", (width, height), (0, 0, 0, 160))
    shadow.paste(black_shape, mask=alpha_mask)
    # Blur shadow
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=14))
    # Offset shadow slightly
    shadow_offset = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_offset.paste(shadow, (0, 6))
    
    # Composite: shadow under the artwork
    composite = Image.alpha_composite(shadow_offset, final_rgb)
    
    # Crop tightly to content
    bbox = composite.getbbox()
    if bbox:
        # Add small padding
        pad = 20
        cb = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(width, bbox[2] + pad), min(height, bbox[3] + pad))
        cropped = composite.crop(cb)
    else:
        cropped = composite
        
    # Save transparent PNG and WEBP
    os.makedirs("public/assets/png", exist_ok=True)
    cropped.save(f"public/assets/png/{out_prefix}.png", "PNG")
    cropped.save(f"public/assets/{out_prefix}.webp", "WEBP", quality=95)
    
    # Save Dark-Preview version (on #131416 background matching kentir's navbar)
    dark_bg = Image.new("RGBA", cropped.size, (19, 20, 22, 255))
    dark_preview = Image.alpha_composite(dark_bg, cropped)
    dark_preview.save(f"public/assets/png/{out_prefix}-dark-preview.png", "PNG")
    
    print(f"Generated {out_prefix}: size {cropped.size}")
    return cropped.size

if __name__ == "__main__":
    create_scrit_horizontal_logo("orbital", "scrit-logo-horizontal")
    create_scrit_horizontal_logo("hex_monogram", "scrit-logo-hex-horizontal")

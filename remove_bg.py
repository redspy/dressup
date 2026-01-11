import os
import sys
from PIL import Image

def remove_green_background(image_path, tolerance=60):
    """
    Removes green background from an image.
    Target Green: (0, 255, 0)
    Tolerance handles slight variations in the green screen.
    """
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        # Target Green color
        bg_r, bg_g, bg_b = 0, 255, 0

        for item in datas:
            r, g, b, a = item
            
            # Check difference from green
            diff = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
            
            # Heuristic: Green is dominant and close to 255, Red/Blue close to 0
            if g > 150 and r < 100 and b < 100: 
                 newData.append((255, 255, 255, 0)) # Transparent
            elif diff < tolerance:
                newData.append((255, 255, 255, 0)) # Transparent
            else:
                newData.append(item)

        img.putdata(newData)
        
        # Save as PNG, replacing the original or ensuring .png extension
        output_path = os.path.splitext(image_path)[0] + ".png"
        img.save(output_path, "PNG")
        print(f"Successfully processed: {output_path}")
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 remove_bg.py <file_or_directory>")
        sys.exit(1)

    target = sys.argv[1]
    
    if os.path.isdir(target):
        for root, dirs, files in os.walk(target):
            for file in files:
                if file.lower().startswith('bg_'):
                    continue
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                     remove_green_background(os.path.join(root, file))
    elif os.path.isfile(target):
        remove_green_background(target)
    else:
        print("Invalid path")

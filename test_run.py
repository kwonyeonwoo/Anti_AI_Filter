import numpy as np
from PIL import Image
from filter import apply_protection_filter
import os

def create_sample_image(path):
    # Create a simple image with some structure (e.g., a circle)
    img_np = np.zeros((300, 300, 3), dtype=np.uint8)
    for i in range(300):
        for j in range(300):
            if (i-150)**2 + (j-150)**2 < 100**2:
                img_np[i, j] = [200, 50, 50] # Reddish circle
            else:
                img_np[i, j] = [50, 200, 50] # Greenish background
    
    img = Image.fromarray(img_np)
    img.save(path)
    print(f"Sample image created: {path}")

if __name__ == "__main__":
    orig_path = "test_orig.png"
    prot_path = "test_prot.png"
    
    create_sample_image(orig_path)
    
    with open(orig_path, "rb") as f:
        orig_bytes = f.read()
    
    print("Applying filter...")
    prot_bytes = apply_protection_filter(orig_bytes, intensity=1.0)
    
    with open(prot_path, "wb") as f:
        f.write(prot_bytes)
    print(f"Protected image saved: {prot_path}")
    
    # Now run the detection test
    import subprocess
    cmd = ["python", "test_ai_detection.py", orig_path, prot_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)

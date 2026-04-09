import torch
from torchvision.models import resnet50, ResNet50_Weights
from PIL import Image
import numpy as np
import io
import os
import sys
from filter import apply_protection_filter

def run_test(image_path):
    try:
        # 1. Load Model
        weights = ResNet50_Weights.DEFAULT
        model = resnet50(weights=weights).eval()
        categories = weights.meta["categories"]
        preprocess = weights.transforms()

        # 2. Get Original Prediction
        orig_img = Image.open(image_path).convert('RGB')
        orig_bytes = io.BytesIO()
        orig_img.save(orig_bytes, format='PNG')
        
        batch = preprocess(orig_img).unsqueeze(0)
        with torch.no_grad():
            output = model(batch)
            probs = torch.nn.functional.softmax(output[0], dim=0)
        
        orig_top_idx = torch.argmax(probs).item()
        orig_label = categories[orig_top_idx]
        orig_conf = probs[orig_top_idx].item() * 100

        # 3. Apply Current Filter
        protected_bytes = apply_protection_filter(orig_bytes.getvalue(), intensity=1.0)
        prot_img = Image.open(io.BytesIO(protected_bytes)).convert('RGB')
        
        # 4. Get Protected Prediction for the SAME class
        batch_prot = preprocess(prot_img).unsqueeze(0)
        with torch.no_grad():
            output_prot = model(batch_prot)
            probs_prot = torch.nn.functional.softmax(output_prot[0], dim=0)
        
        prot_conf = probs_prot[orig_top_idx].item() * 100
        # Protection Score: How much the original class confidence dropped
        protection_score = 100 - prot_conf
        
        print(f"RESULT|Original: {orig_label} ({orig_conf:.1f}%) | Protected: {prot_conf:.1f}% | Score: {protection_score:.2f}")
    except Exception as e:
        print(f"ERROR|{str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    run_test(sys.argv[1])

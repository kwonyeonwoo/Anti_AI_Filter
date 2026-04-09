import torch
import torch.nn as nn
from torchvision.models import mobilenet_v2, MobileNet_V2_Weights
from PIL import Image
import numpy as np
import sys
import io
import os

def pgd_attack(image_path, intensity=0.5, eps=8/255, alpha=2/255, steps=5):
    """
    Projected Gradient Descent (PGD) Attack.
    Optimizes noise to maximize AI confusion (entropy).
    """
    try:
        # 1. Load Lightweight Surrogate Model (MobileNetV2)
        # We use a surrogate to find noise that transfers well to other models
        weights = MobileNet_V2_Weights.DEFAULT
        model = mobilenet_v2(weights=weights).eval()
        for param in model.parameters():
            param.requires_grad = False
            
        preprocess = weights.transforms()
        
        # 2. Load and Prepare Image
        img_pil = Image.open(image_path).convert('RGB')
        orig_np = np.array(img_pil).astype(np.float32) / 255.0
        input_tensor = preprocess(img_pil).unsqueeze(0)
        input_tensor.requires_grad = True
        
        # 3. Iterative Attack (PGD)
        # We want to increase the loss/uncertainty of the model
        adv_tensor = input_tensor.clone().detach().requires_grad_(True)
        
        for i in range(steps):
            outputs = model(adv_tensor)
            # Loss: Maximize entropy or maximize loss of top class
            # Here we just use a target-less attack to shatter features
            loss = torch.log(torch.sum(torch.exp(outputs)))
            
            model.zero_grad()
            loss.backward()
            
            # Move in the direction of increasing loss (Adversarial Direction)
            with torch.no_grad():
                grad = adv_tensor.grad.sign()
                adv_tensor = adv_tensor + alpha * grad * intensity
                # Projection: Ensure it doesn't drift too far from original (L-inf constraint)
                delta = torch.clamp(adv_tensor - input_tensor, min=-eps, max=eps)
                adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                adv_tensor.requires_grad = True

        # 4. Post-process and Blend
        # Convert back to PIL image
        adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
        
        # Blend with original to keep it very subtle (human vision priority)
        # Result: High contrast where AI is sensitive, low where humans are sensitive
        protected_np = (adv_np * 255).astype(np.uint8)
        
        # Save to stdout for main.py to read
        res_img = Image.fromarray(protected_np)
        res_img.save(sys.stdout.buffer, format="PNG")
        
    except Exception as e:
        # Fail gracefully back to original if error occurs
        with open(image_path, 'rb') as f:
            sys.stdout.buffer.write(f.read())

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    # Intensity 0.0 to 1.0 translates to attack strength
    intensity = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    pgd_attack(sys.argv[1], intensity=intensity)

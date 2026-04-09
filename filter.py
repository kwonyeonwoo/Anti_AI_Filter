import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet50, ResNet50_Weights
import numpy as np
from PIL import Image
import io
import cv2
import os

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

def apply_protection_filter(image_bytes: bytes, intensity: float = 0.5) -> bytes:
    """
    ROBUST AI PROTECTION FILTER (V3.0)
    Optimized for maximizing AI confusion and disrupting style/feature extraction.
    """
    try:
        # 1. Load Surrogate Model (ResNet50)
        weights = ResNet50_Weights.DEFAULT
        model = resnet50(weights=weights).eval()
        preprocess = weights.transforms()
        
        # 2. Image Preparation
        img_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = img_pil.size
        input_tensor = preprocess(img_pil).unsqueeze(0)
        input_tensor.requires_grad = True
        
        # 3. Multi-Layer Attack Strategy
        # Target multiple feature extraction layers for maximum disruption
        target_layers = [model.layer2[-1], model.layer3[-1], model.layer4[-1]]
        layer_outputs = []
        
        def get_hook(idx):
            def hook(module, input, output):
                layer_outputs.append(output)
            return hook

        handles = [layer.register_forward_hook(get_hook(i)) for i, layer in enumerate(target_layers)]
        
        # Get original features
        model(input_tensor)
        orig_features = [f.detach() for f in layer_outputs]
        layer_outputs.clear()
        
        # Stronger PGD Optimization
        iters = 20 # Increased iterations
        eps = (32 / 255) * intensity # Significantly increased Max pixel change
        alpha = 3.0 / 255
        
        adv_tensor = input_tensor.clone().detach().requires_grad_(True)
        
        for _ in range(iters):
            model.zero_grad()
            model(adv_tensor)
            
            # Total Loss: Sum of feature distance from multiple layers
            loss = 0
            for i in range(len(layer_outputs)):
                loss -= F.mse_loss(layer_outputs[i], orig_features[i])
            
            loss.backward()
            layer_outputs.clear()
            
            with torch.no_grad():
                grad = adv_tensor.grad.sign()
                adv_tensor = adv_tensor + alpha * grad
                delta = torch.clamp(adv_tensor - input_tensor, min=-eps, max=eps)
                adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                adv_tensor.requires_grad = True
        
        for h in handles:
            h.remove()
        
        # 4. Global Noise Blending (No Masking for better protection)
        adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
        adv_img_np = (adv_np * 255).astype(np.uint8)
        adv_img_np = cv2.resize(adv_img_np, (orig_w, orig_h))
        
        # Blend original and adversarial image
        # Higher weight to adversarial image for stronger protection
        orig_np = np.array(img_pil)
        
        # Adaptive Blending: Keep some original texture but force noise into all channels
        blend_factor = 0.5 + (0.4 * intensity) # Up to 90% adversarial content
        final_np = cv2.addWeighted(orig_np, 1 - blend_factor, adv_img_np, blend_factor, 0)
        
        # Final cleanup and save
        res_pil = Image.fromarray(final_np)
        img_byte_arr = io.BytesIO()
        res_pil.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        print(f"Filter Error: {e}")
        return image_bytes

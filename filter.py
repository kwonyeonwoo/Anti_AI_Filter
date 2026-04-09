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

def apply_protection_filter(image_bytes: bytes, intensity: float = 1.0) -> bytes:
    """
    PRECISION STEALTH-MAX FILTER (V6.0)
    Target: Image Fidelity 96/100 + AI Disruption 100%
    1. Surgical Semantic Attack (60 Iterations)
    2. Adaptive JND Masking (Flat-area suppression)
    3. High-Fidelity Constraint (Eps = 8/255)
    """
    try:
        # Load Model
        weights = ResNet50_Weights.DEFAULT
        model = resnet50(weights=weights).eval()
        preprocess = weights.transforms()
        
        # Image Preparation
        img_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = img_pil.size
        input_tensor = preprocess(img_pil).unsqueeze(0)
        
        # --- Step 1: Precision Human Visual System Masking ---
        img_np = np.array(img_pil)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY).astype(np.float32)
        
        # Sobel for high-frequency awareness
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        edge_mag = np.sqrt(sobelx**2 + sobely**2)
        
        # Advanced JND: Suppress noise in flat areas (low variance)
        texture_mask = cv2.GaussianBlur(edge_mag, (9, 9), 0)
        texture_mask = (texture_mask - texture_mask.min()) / (texture_mask.max() + 1e-6)
        
        # Power Curve: Harshly suppress noise in smooth areas (96/100 goal)
        p_mask = np.power(texture_mask, 0.7) 
        p_mask = np.clip(p_mask, 0.05, 1.0) # Very low noise in flat areas
        p_mask_tensor = torch.from_numpy(cv2.resize(p_mask, (224, 224))).unsqueeze(0).unsqueeze(0)
        
        # --- Step 2: Surgical Semantic Optimization ---
        iters = 60 # More iterations for surgical precision
        eps_limit = 8 / 255 # Strict limit for 96/100 fidelity
        alpha = 1.0 / 255
        
        adv_tensor = input_tensor.clone().detach().requires_grad_(True)
        
        # Target Deep Semantic layers
        target_layers = [model.layer3[-1], model.layer4[-1]]
        features = []
        def get_hook():
            def hook(module, input, output):
                features.append(output)
            return hook
        handles = [l.register_forward_hook(get_hook()) for l in target_layers]
        
        # Get Original features
        model(input_tensor)
        orig_feats = [f.detach() for f in features]
        features.clear()
        
        for _ in range(iters):
            # EoT: Make noise robust to compression
            curr_input = adv_tensor
            if np.random.rand() > 0.5:
                curr_input = F.avg_pool2d(adv_tensor, kernel_size=3, stride=1, padding=1)
            
            model.zero_grad()
            model(curr_input)
            
            # Semantic Poisoning Loss: Maximize feature distance
            loss = 0
            for i in range(len(features)):
                loss -= F.mse_loss(features[i], orig_feats[i])
            
            loss.backward()
            features.clear()
            
            with torch.no_grad():
                grad = adv_tensor.grad.sign()
                # Apply surgical noise through mask
                adv_tensor = adv_tensor + (alpha * grad * p_mask_tensor)
                
                # Dynamic Constraint: Stealth ball
                curr_eps = eps_limit * p_mask_tensor
                delta = torch.clamp(adv_tensor - input_tensor, min=-curr_eps, max=curr_eps)
                adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                adv_tensor.requires_grad = True
        
        for h in handles:
            h.remove()
            
        # --- Step 3: High-Fidelity Reconstruction ---
        adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
        adv_img_np = (adv_np * 255).astype(np.uint8)
        final_img = cv2.resize(adv_img_np, (orig_w, orig_h))
        
        # Optional: Subtle Post-smoothing only in sensitive areas
        final_lab = cv2.cvtColor(final_img, cv2.COLOR_RGB2LAB).astype(np.float32)
        orig_lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB).astype(np.float32)
        
        # Ensure L (Luminance) stays extremely close to original in flat areas
        p_mask_full = cv2.resize(p_mask, (orig_w, orig_h))
        final_lab[:,:,0] = orig_lab[:,:,0] * (1 - p_mask_full * 0.2) + final_lab[:,:,0] * (p_mask_full * 0.2)
        
        res_img = cv2.cvtColor(np.clip(final_lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
        
        res_pil = Image.fromarray(res_img)
        img_byte_arr = io.BytesIO()
        res_pil.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        print(f"V6 Error: {e}")
        return image_bytes

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
    DEEP-FEATURE DISRUPTION FILTER (V5.0)
    1. Multi-Layer Semantic Attack (Layer 3 & 4)
    2. Luminance-Aware JND Masking
    3. Advanced EoT for Compression Resistance
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
        
        # --- Step 1: Intelligent Masking (Human Visual System) ---
        img_np = np.array(img_pil)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY).astype(np.float32)
        
        # Texture Mask (Variance)
        local_var = cv2.GaussianBlur(gray**2, (7,7), 0) - cv2.GaussianBlur(gray, (7,7), 0)**2
        texture_mask = np.sqrt(np.maximum(local_var, 0))
        
        # Luminance Mask (People see noise less in very dark/bright areas)
        lum_mask = np.exp(-((gray - 128)**2) / (2 * 64**2)) # Bell curve centered at 128
        lum_mask = 1.0 - (lum_mask * 0.5) # Boost noise in dark/bright
        
        # Combined Perceptual Mask
        combined_mask = (texture_mask / (texture_mask.max() + 1e-6)) * lum_mask
        combined_mask = np.clip(combined_mask * 2.0, 0.3, 1.2) # Minimum 30% noise power everywhere
        p_mask_tensor = torch.from_numpy(cv2.resize(combined_mask, (224, 224))).unsqueeze(0).unsqueeze(0)
        
        # --- Step 2: Multi-Layer Semantic Optimization ---
        iters = 30
        eps_base = 16 / 255 # Increased base power
        alpha = 2.0 / 255
        
        adv_tensor = input_tensor.clone().detach().requires_grad_(True)
        
        # Target Mid (Style) and Deep (Content) layers
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
            # Advanced EoT: Simulate multiple image degradations
            curr_input = adv_tensor
            rand_val = np.random.rand()
            if rand_val > 0.7:
                # Simulate downsampling
                curr_input = F.interpolate(F.interpolate(adv_tensor, scale_factor=0.8), size=(224,224))
            elif rand_val > 0.4:
                # Simulate blurring
                curr_input = F.avg_pool2d(adv_tensor, kernel_size=3, stride=1, padding=1)
            
            model.zero_grad()
            model(curr_input)
            
            loss = 0
            for i in range(len(features)):
                loss -= F.mse_loss(features[i], orig_feats[i])
            
            loss.backward()
            features.clear()
            
            with torch.no_grad():
                grad = adv_tensor.grad.sign()
                # Apply noise through perceptual mask
                adv_tensor = adv_tensor + (alpha * grad * p_mask_tensor)
                
                # Dynamic Epsilon ball
                curr_eps = eps_base * p_mask_tensor
                delta = torch.clamp(adv_tensor - input_tensor, min=-curr_eps, max=curr_eps)
                adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                adv_tensor.requires_grad = True
        
        for h in handles:
            h.remove()
            
        # --- Step 3: Reconstruction with zero dilution ---
        adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
        adv_img_np = (adv_np * 255).astype(np.uint8)
        final_img = cv2.resize(adv_img_np, (orig_w, orig_h))
        
        # No more weighted blending with original! Use the optimized result directly.
        # This preserves 100% of the adversarial power while epsilon ensures quality.
        res_pil = Image.fromarray(final_img)
        img_byte_arr = io.BytesIO()
        res_pil.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        print(f"V5 Error: {e}")
        return image_bytes

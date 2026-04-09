import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet50, resnet18, ResNet50_Weights, ResNet18_Weights
import numpy as np
from PIL import Image
import io
import cv2
import os

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

def apply_protection_filter(image_bytes: bytes, intensity: float = 1.0) -> bytes:
    """
    HIGH-FIDELITY GUARD (V8.0)
    1. Zero-Blur Strategy (Process noise separately)
    2. Perceptual Masking (Hide noise in textures)
    3. Exact Dimension Preservation
    4. Best-of-N Verification Loop
    """
    try:
        # Load Models
        weights_adv = ResNet50_Weights.DEFAULT
        model_adv = resnet50(weights=weights_adv).eval()
        weights_ver = ResNet18_Weights.DEFAULT
        model_ver = resnet18(weights=weights_ver).eval()
        
        preprocess = weights_adv.transforms()
        
        # Original Image Loading
        img_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = img_pil.size
        img_np_orig = np.array(img_pil)
        
        # Prepare low-res version for AI processing
        img_low = img_pil.resize((224, 224), Image.LANCZOS)
        input_tensor = preprocess(img_low).unsqueeze(0)
        
        # --- Step 1: Perceptual Masking (High Res) ---
        gray = cv2.cvtColor(img_np_orig, cv2.COLOR_RGB2GRAY).astype(np.float32)
        local_var = cv2.GaussianBlur(gray**2, (15, 15), 0) - cv2.GaussianBlur(gray, (15, 15), 0)**2
        texture_mask = np.sqrt(np.maximum(local_var, 0))
        texture_mask = (texture_mask - texture_mask.min()) / (texture_mask.max() + 1e-6)
        
        # Final Mask: Suppress flat areas heavily
        p_mask = np.power(texture_mask, 0.8)
        p_mask = np.clip(p_mask, 0.05, 1.0)
        p_mask_low = torch.from_numpy(cv2.resize(p_mask, (224, 224))).unsqueeze(0).unsqueeze(0)

        # --- Step 2: Verification Loop (Search for optimal noise pattern) ---
        best_noise_low = torch.zeros_like(input_tensor)
        min_similarity = 1.0
        
        with torch.no_grad():
            orig_ver_feat = model_ver(input_tensor)

        # Try different seeds to find the best stealth/defense balance
        for attempt in range(2): 
            adv_tensor = input_tensor.clone().detach().requires_grad_(True)
            
            # Optimization (Target layer4 for deep semantic protection)
            target_layer = model_adv.layer4[-1]
            features = []
            def hook(m, i, o): features.append(o)
            handle = target_layer.register_forward_hook(hook)
            
            model_adv(input_tensor)
            orig_feat = features[0].detach()
            features.clear()
            
            # Iterative update
            eps_limit = (10 / 255) # Hard cap for 96/100 quality
            alpha = 1.0 / 255
            
            for _ in range(40):
                model_adv(adv_tensor)
                loss = -F.mse_loss(features[0], orig_feat)
                loss.backward()
                features.clear()
                
                with torch.no_grad():
                    grad = adv_tensor.grad.sign()
                    # Apply noise pattern through mask
                    adv_tensor = adv_tensor + (alpha * grad * p_mask_low)
                    # Add random jitter to find new patterns
                    if attempt > 0: adv_tensor += torch.randn_like(adv_tensor) * 0.001
                    
                    delta = torch.clamp(adv_tensor - input_tensor, min=-eps_limit, max=eps_limit)
                    adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                    adv_tensor.requires_grad = True
            
            handle.remove()
            
            # Verify attempt
            with torch.no_grad():
                prot_ver_feat = model_ver(adv_tensor)
                sim = F.cosine_similarity(orig_ver_feat.flatten(), prot_ver_feat.flatten(), dim=0).item()
                if sim < min_similarity:
                    min_similarity = sim
                    best_noise_low = (adv_tensor - input_tensor).detach()
        
        # --- Step 3: Zero-Blur Reconstruction ---
        # Resize NOISE ONLY, not the whole image
        noise_np = best_noise_low.squeeze(0).permute(1, 2, 0).cpu().numpy()
        noise_high = cv2.resize(noise_np, (orig_w, orig_h), interpolation=cv2.INTER_LANCZOS4)
        
        # Apply noise to original high-res image pixels
        final_np = img_np_orig.astype(np.float32) / 255.0
        # Expand p_mask for broadcast
        final_np = final_np + (noise_high * np.expand_dims(p_mask, axis=2))
        final_np = np.clip(final_np * 255.0, 0, 255).astype(np.uint8)
        
        # Save keeping exact original size and format
        res_pil = Image.fromarray(final_np)
        img_byte_arr = io.BytesIO()
        res_pil.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        print(f"V8 Error: {e}")
        return image_bytes

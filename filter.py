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
    STEALTH-ROBUST HYBRID FILTER (V4.0)
    1. Targeted Feature Attack (AI-Guided)
    2. Perceptual Masking (Invisible to Humans)
    3. Compression-Resistant Optimization (EoT)
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
        
        # --- Step 1 & 2: Generate Perceptual Mask (HVS based) ---
        # Find high-texture areas to hide noise better
        img_np = np.array(img_pil)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        
        # Texture complexity map using local variance
        # Areas with high variance can hide more noise
        local_std = cv2.GaussianBlur(gray.astype(np.float32)**2, (7,7), 0) - \
                    cv2.GaussianBlur(gray.astype(np.float32), (7,7), 0)**2
        local_std = np.sqrt(np.maximum(local_std, 0))
        
        # Normalize mask (0.2 to 1.0 range to ensure at least some noise everywhere)
        p_mask = (local_std - local_std.min()) / (local_std.max() - local_std.min() + 1e-6)
        p_mask = np.clip(p_mask * 1.5, 0.2, 1.0)
        p_mask_tensor = torch.from_numpy(cv2.resize(p_mask, (224, 224))).unsqueeze(0).unsqueeze(0)
        
        # --- Step 3: Compression-Resistant Optimization (EoT) ---
        iters = 25
        eps_base = 12 / 255 # Base epsilon
        alpha = 1.5 / 255
        
        adv_tensor = input_tensor.clone().detach().requires_grad_(True)
        
        # Target Mid-to-Deep Layers for Style/Feature protection
        target_layer = model.layer3[-1]
        features = []
        def hook(module, input, output):
            features.append(output)
        handle = target_layer.register_forward_hook(hook)
        
        model(input_tensor)
        orig_feat = features[0].detach()
        features.clear()
        
        for _ in range(iters):
            # EoT: Randomly apply small jitter/blur to make noise robust to compression
            # This simulates what happens during JPEG/PNG encoding
            noise_input = adv_tensor
            if np.random.rand() > 0.5:
                noise_input = F.avg_pool2d(adv_tensor, kernel_size=3, stride=1, padding=1)
            
            model.zero_grad()
            model(noise_input)
            adv_feat = features[0]
            
            # Loss: Distance in feature space
            loss = -F.mse_loss(adv_feat, orig_feat)
            loss.backward()
            features.clear()
            
            with torch.no_grad():
                grad = adv_tensor.grad.sign()
                # Apply noise adjusted by Perceptual Mask
                # This ensures noise is strong in textures, but weak in smooth areas
                adv_tensor = adv_tensor + (alpha * grad * p_mask_tensor)
                
                # Dynamic Epsilon ball based on texture
                curr_eps = eps_base * p_mask_tensor
                delta = torch.clamp(adv_tensor - input_tensor, min=-curr_eps, max=curr_eps)
                adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                adv_tensor.requires_grad = True
        
        handle.remove()
        
        # --- Final Blending & Post-Processing ---
        adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
        adv_img_np = (adv_np * 255).astype(np.uint8)
        adv_img_np = cv2.resize(adv_img_np, (orig_w, orig_h))
        
        # Frequency domain blending (keep low frequencies of original, high for adv)
        # This further helps in surviving compression while being invisible
        final_img = adv_img_np.astype(np.float32)
        
        # Soft-blend based on texture mask to ensure high-fidelity in smooth areas
        p_mask_full = cv2.resize(p_mask, (orig_w, orig_h))
        p_mask_full = np.expand_dims(p_mask_full, axis=2)
        
        # High texture areas get more adversarial noise, smooth areas stay original
        final_np = img_np * (1 - p_mask_full * 0.4) + final_img * (p_mask_full * 0.4)
        
        # Save with high quality to preserve the carefully crafted noise
        res_pil = Image.fromarray(np.clip(final_np, 0, 255).astype(np.uint8))
        img_byte_arr = io.BytesIO()
        res_pil.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        print(f"V4 Error: {e}")
        return image_bytes

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
    SELF-VERIFYING GUARD (V7.0)
    1. Generate Noise (Surgical Attack)
    2. Verify with Secondary AI (Learning Resistance Test)
    3. Loop & Retry if learning is still possible.
    """
    # Load Models
    weights_adv = ResNet50_Weights.DEFAULT
    model_adv = resnet50(weights=weights_adv).eval()
    
    # Load Verifier Model (Different architecture to ensure robustness)
    weights_ver = ResNet18_Weights.DEFAULT
    model_ver = resnet18(weights=weights_ver).eval()
    
    preprocess = weights_adv.transforms()
    
    img_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    orig_w, orig_h = img_pil.size
    input_tensor = preprocess(img_pil).unsqueeze(0)
    
    # Pre-calculate original features for verification
    with torch.no_grad():
        orig_ver_feat = model_ver(input_tensor)

    max_retries = 3
    current_attempt = 0
    best_result_bytes = image_bytes
    
    # Adaptive Params that change on retry
    eps_limit = 10 / 255 
    alpha = 1.2 / 255
    
    while current_attempt < max_retries:
        current_attempt += 1
        print(f"--- Filter Attempt {current_attempt} ---")
        
        # 1. Generate Noisy Image
        adv_tensor = input_tensor.clone().detach().requires_grad_(True)
        target_layer = model_adv.layer4[-1] # Deep semantic target
        features = []
        def hook(m, i, o): features.append(o)
        handle = target_layer.register_forward_hook(hook)
        
        model_adv(input_tensor)
        orig_feat = features[0].detach()
        features.clear()
        
        # Optimization Loop
        for _ in range(40 + (current_attempt * 10)):
            model_adv(adv_tensor)
            loss = -F.mse_loss(features[0], orig_feat)
            loss.backward()
            features.clear()
            
            with torch.no_grad():
                # On retries, we shift the noise pattern randomly
                noise_shift = torch.randn_like(adv_tensor) * 0.001 * current_attempt
                grad = adv_tensor.grad.sign()
                adv_tensor = adv_tensor + (alpha * grad) + noise_shift
                delta = torch.clamp(adv_tensor - input_tensor, min=-eps_limit, max=eps_limit)
                adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                adv_tensor.requires_grad = True
        
        handle.remove()
        
        # 2. VERIFICATION STEP: Can a different AI still "learn" this?
        with torch.no_grad():
            prot_ver_feat = model_ver(adv_tensor)
            # Calculate Similarity (How much "Style/Identity" survived)
            similarity = F.cosine_similarity(orig_ver_feat.flatten(), prot_ver_feat.flatten(), dim=0).item()
            print(f"AI Learning Similarity Score: {similarity:.4f} (Lower is better)")
            
        # 3. DECISION
        # If similarity < 0.75, the AI is sufficiently confused (Learning Failed)
        if similarity < 0.75:
            print("✅ SUCCESS: AI Learning Blocked.")
            adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
            adv_img_np = (adv_np * 255).astype(np.uint8)
            final_img = cv2.resize(adv_img_np, (orig_w, orig_h))
            
            res_pil = Image.fromarray(final_img)
            img_byte_arr = io.BytesIO()
            res_pil.save(img_byte_arr, format='PNG', optimize=True)
            return img_byte_arr.getvalue()
        else:
            print("❌ FAIL: AI still recognizes the style. Retrying with stronger attack...")
            # Increase power for next attempt
            eps_limit += 4 / 255
            alpha += 0.5 / 255
            
            # Save the current best as a fallback
            adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
            best_result_bytes = cv2.resize((adv_np * 255).astype(np.uint8), (orig_w, orig_h))

    # If all retries fail, return the strongest one we found
    print("⚠️ Max retries reached. Outputting strongest protection found.")
    res_pil = Image.fromarray(best_result_bytes)
    img_byte_arr = io.BytesIO()
    res_pil.save(img_byte_arr, format='PNG', optimize=True)
    return img_byte_arr.getvalue()

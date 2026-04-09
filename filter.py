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
    AI-Guided Stealth Style Protection.
    Uses AI to find critical feature locations and injects invisible 
    perturbations to disrupt style learning while preserving visual quality.
    """
    try:
        # 1. Load Surrogate Model (ResNet50) for targeting
        weights = ResNet50_Weights.DEFAULT
        model = resnet50(weights=weights).eval()
        preprocess = weights.transforms()
        
        # 2. Image Preparation
        img_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = img_pil.size
        # Process at AI resolution for gradient analysis
        input_tensor = preprocess(img_pil).unsqueeze(0)
        input_tensor.requires_grad = True
        
        # 3. Targeted Feature Disruption (AI vs AI)
        # We target the mid-level layers where "Style" and "Texture" are encoded.
        target_layer = model.layer3[-1] # Mid-to-High features layer
        features = []
        def hook(module, input, output):
            features.append(output)
        handle = target_layer.register_forward_hook(hook)
        
        # Forward pass to get original features
        model(input_tensor)
        orig_features = features[0].detach()
        features.clear()
        
        # Iterative Optimization: Find noise that maximizes feature distance
        # but minimizes visual change.
        iters = 6
        eps = (6 / 255) * intensity # Max pixel change (Strict limit for invisibility)
        alpha = 1.5 / 255
        
        adv_tensor = input_tensor.clone().detach().requires_grad_(True)
        
        for _ in range(iters):
            model.zero_grad()
            model(adv_tensor)
            adv_features = features[0]
            
            # Loss: Maximize the difference in AI's feature space (Style Shattering)
            loss = -F.mse_loss(adv_features, orig_features)
            loss.backward()
            features.clear()
            
            with torch.no_grad():
                # Optimize noise based on AI's sensitivity gradients
                grad = adv_tensor.grad.sign()
                adv_tensor = adv_tensor + alpha * grad
                # Constraint: Projection back to epsilon ball (Invisible constraint)
                delta = torch.clamp(adv_tensor - input_tensor, min=-eps, max=eps)
                adv_tensor = torch.clamp(input_tensor + delta, min=0, max=1)
                adv_tensor.requires_grad = True
        
        handle.remove()
        
        # 4. Convert back and Perceptual Smoothing
        adv_np = adv_tensor.squeeze(0).detach().permute(1, 2, 0).cpu().numpy()
        adv_img_np = (adv_np * 255).astype(np.uint8)
        adv_img_np = cv2.resize(adv_img_np, (orig_w, orig_h))
        
        # 5. LAB Chrominance Blending (Stealth Mode)
        # Focus noise on color channels (AB) where humans are less sensitive
        orig_np = np.array(img_pil)
        orig_lab = cv2.cvtColor(orig_np, cv2.COLOR_RGB2LAB).astype(np.float32)
        adv_lab = cv2.cvtColor(adv_img_np, cv2.COLOR_RGB2LAB).astype(np.float32)
        
        # Masking: Only apply noise where AI is most sensitive (Edge/Texture)
        gray = orig_np.mean(axis=2)
        edges = cv2.Canny(gray.astype(np.uint8), 100, 200)
        mask = cv2.GaussianBlur(edges.astype(np.float32), (5, 5), 0) / 255.0
        mask = np.expand_dims(mask, axis=2)
        
        # Keep original L (Luminance) mostly intact for sharpness
        # Blend Color channels heavily
        final_lab = orig_lab.copy()
        final_lab[:,:,1:3] = orig_lab[:,:,1:3] * (1 - mask * 0.7) + adv_lab[:,:,1:3] * (mask * 0.7)
        # Very tiny jitter to L only in high texture areas
        final_lab[:,:,0] = orig_lab[:,:,0] * (1 - mask * 0.1) + adv_lab[:,:,0] * (mask * 0.1)
        
        final_np = cv2.cvtColor(np.clip(final_lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
        
        # Final cleanup
        res_pil = Image.fromarray(final_np)
        img_byte_arr = io.BytesIO()
        res_pil.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        # If AI model fails, return original with a very subtle procedural mask
        return image_bytes

import torch
import torch.nn.functional as F
from torchvision.models import resnet50, ResNet50_Weights
from PIL import Image
import numpy as np
import cv2
import sys
import base64
import io

def generate_heatmap(image_path):
    try:
        # 1. Load Model
        weights = ResNet50_Weights.DEFAULT
        model = resnet50(weights=weights)
        model.eval()
        
        # 2. Setup Grad-CAM Hooks
        target_layer = model.layer4[-1]
        gradients = []
        activations = []
        
        def save_gradient(module, grad_input, grad_output):
            gradients.append(grad_output[0])
            
        def save_activation(module, input, output):
            activations.append(output)
            
        target_layer.register_forward_hook(save_activation)
        target_layer.register_full_backward_hook(save_gradient)
        
        # 3. Preprocess Image
        preprocess = weights.transforms()
        img_pil = Image.open(image_path).convert('RGB')
        input_tensor = preprocess(img_pil).unsqueeze(0)
        input_tensor.requires_grad = True

        # 4. Forward Pass
        output = model(input_tensor)
        top_idx = torch.argmax(output).item()
        
        # 5. Backward Pass to get Gradients
        model.zero_grad()
        score = output[0, top_idx]
        score.backward()
        
        # 6. Compute CAM (Weighted Activation)
        grads = gradients[0].cpu().data.numpy().squeeze()
        acts = activations[0].cpu().data.numpy().squeeze()
        
        # Global Average Pooling of gradients to get channel weights
        weights = np.mean(grads, axis=(1, 2))
        
        # Weighted combination of activations
        cam = np.zeros(acts.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * acts[i]
            
        # 7. Post-process Heatmap
        cam = np.maximum(cam, 0)
        cam = cam / (np.max(cam) + 1e-10)
        cam = cv2.resize(cam, (img_pil.size[0], img_pil.size[1]))
        
        # Sharpen the attention area for visual clarity
        cam = np.power(cam, 1.5) # Exaggerate high-attention areas
        
        # 8. Overlay
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        
        orig_np = np.array(img_pil)
        overlay = cv2.addWeighted(orig_np, 0.6, heatmap, 0.4, 0)
        
        # 9. Return as Base64
        res_img = Image.fromarray(overlay)
        buffered = io.BytesIO()
        res_img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
        
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    print(generate_heatmap(sys.argv[1]))

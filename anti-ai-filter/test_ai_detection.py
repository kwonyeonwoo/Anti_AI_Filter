import torch
import torchvision.transforms as transforms
from torchvision.models import resnet50, ResNet50_Weights
from PIL import Image
import os
import sys

# 1. Load Pre-trained AI Model (ResNet50)
weights = ResNet50_Weights.DEFAULT
model = resnet50(weights=weights)
model.eval()
categories = weights.meta["categories"]

# 2. Preprocessing
preprocess = weights.transforms()

def predict(image_path):
    try:
        img = Image.open(image_path).convert('RGB')
        batch = preprocess(img).unsqueeze(0)
        
        with torch.no_grad():
            prediction = model(batch).squeeze(0)
            probs = torch.nn.functional.softmax(prediction, dim=0)
            
        # Get top 3 predictions
        top3_prob, top3_catid = torch.topk(probs, 3)
        
        results = []
        for i in range(3):
            results.append(f"{categories[top3_catid[i]]}: {top3_prob[i].item()*100:.2f}%")
        return results
    except Exception as e:
        return [f"Error: {str(e)}"]

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python test_ai_detection.py <original_path> <protected_path>")
        sys.exit(1)
        
    orig_path = sys.argv[1]
    prot_path = sys.argv[2]
    
    print("\n[AI Detection Test Results]")
    print("-" * 30)
    print(f"Original Image: {orig_path}")
    for res in predict(orig_path):
        print(f"  -> {res}")
        
    print("-" * 30)
    print(f"Protected Image: {prot_path}")
    for res in predict(prot_path):
        print(f"  -> {res}")
    print("-" * 30)

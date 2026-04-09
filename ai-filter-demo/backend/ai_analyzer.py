import os
import sys
import json
import io

# Suppress common library warnings that might pollute stdout
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["CUDA_VISIBLE_DEVICES"] = "-1" # Force CPU only

def get_prediction(image_path):
    try:
        # Move imports inside to capture import errors
        import torch
        from torchvision.models import resnet50, ResNet50_Weights
        from PIL import Image

        weights = ResNet50_Weights.DEFAULT
        model = resnet50(weights=weights)
        model.eval()
        categories = weights.meta["categories"]
        preprocess = weights.transforms()

        img = Image.open(image_path).convert('RGB')
        batch = preprocess(img).unsqueeze(0)
        
        with torch.no_grad():
            prediction = model(batch).squeeze(0)
            probs = torch.nn.functional.softmax(prediction, dim=0)
            
        top_prob, top_catid = torch.topk(probs, 1)
        return {
            "label": categories[top_catid[0]],
            "confidence": float(top_prob[0].item() * 100)
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    result = get_prediction(sys.argv[1])
    # Ensure ONLY the JSON is printed to stdout
    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()

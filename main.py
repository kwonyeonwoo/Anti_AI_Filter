from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from filter import apply_protection_filter
import io
import os
import base64
import subprocess
import json
import tempfile
import sys

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_script_json(script_name, image_bytes):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name
    try:
        # Use absolute path for scripts in container
        script_path = os.path.join(os.path.dirname(__file__), script_name)
        # In Docker, os.sys.executable might point to /usr/local/bin/python
        cmd = ["python", script_path, tmp_path]
        
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        
        if result.returncode != 0:
            print(f"ERROR in {script_name}: {result.stderr}")
            return "{}"
            
        return result.stdout.strip()
    except Exception as e:
        print(f"EXCEPTION in run_script_json ({script_name}): {str(e)}")
        return "{}"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/protect")
async def protect_image(file: UploadFile = File(...), intensity: float = Form(0.5)):
    try:
        image_bytes = await file.read()
        
        # 1. Apply Filter
        protected_bytes = apply_protection_filter(image_bytes, intensity)
        
        # 2. AI Analysis
        orig_ai_json = run_script_json("ai_analyzer.py", image_bytes)
        orig_heatmap = run_script_json("vision_explorer.py", image_bytes)
        prot_ai_json = run_script_json("ai_analyzer.py", protected_bytes)
        prot_heatmap = run_script_json("vision_explorer.py", protected_bytes)
        
        # Parse AI results with safe defaults
        orig_label, prot_label = "Analysis Error", "Analysis Error"
        try:
            if orig_ai_json:
                data = json.loads(orig_ai_json)
                orig_label = f"{data['label']} ({data['confidence']:.1f}%)" if 'label' in data else "Error"
            if prot_ai_json:
                data = json.loads(prot_ai_json)
                prot_label = f"{data['label']} ({data['confidence']:.1f}%)" if 'label' in data else "Error"
        except Exception as pe:
            print(f"JSON Parse Error: {pe}")

        encoded_image = base64.b64encode(protected_bytes).decode('utf-8')
        
        return JSONResponse(content={
            "image": f"data:image/png;base64,{encoded_image}",
            "original_ai": orig_label,
            "protected_ai": prot_label,
            "original_heatmap": f"data:image/png;base64,{orig_heatmap}" if orig_heatmap and not orig_heatmap.startswith("Error") else "",
            "protected_heatmap": f"data:image/png;base64,{prot_heatmap}" if prot_heatmap and not prot_heatmap.startswith("Error") else ""
        })
    except Exception as e:
        print(f"GLOBAL SERVER ERROR: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/")
def read_root():
    return {"message": "AI-Guard Robust API v3.0 (Global Protection) is running on Hugging Face!"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)

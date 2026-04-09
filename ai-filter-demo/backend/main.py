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
        cmd = [os.sys.executable, script_name, tmp_path]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        return result.stdout.strip()
    except Exception as e:
        return "{}"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/protect")
async def protect_image(file: UploadFile = File(...), intensity: float = Form(0.5)):
    image_bytes = await file.read()
    
    # Apply Perceptual AI Filter
    protected_bytes = apply_protection_filter(image_bytes, intensity)
    
    # Analyze
    orig_ai_json = run_script_json("ai_analyzer.py", image_bytes)
    orig_heatmap = run_script_json("vision_explorer.py", image_bytes)
    prot_ai_json = run_script_json("ai_analyzer.py", protected_bytes)
    prot_heatmap = run_script_json("vision_explorer.py", protected_bytes)
    
    try:
        orig_ai = json.loads(orig_ai_json)
        prot_ai = json.loads(prot_ai_json)
        orig_label = f"{orig_ai['label']} ({orig_ai['confidence']:.1f}%)" if "label" in orig_ai else "Error"
        prot_label = f"{prot_ai['label']} ({prot_ai['confidence']:.1f}%)" if "label" in prot_ai else "Error"
    except:
        orig_label, prot_label = "Analysis Error", "Analysis Error"

    encoded_image = base64.b64encode(protected_bytes).decode('utf-8')
    
    return JSONResponse(content={
        "image": f"data:image/png;base64,{encoded_image}",
        "original_ai": orig_label,
        "protected_ai": prot_label,
        "original_heatmap": f"data:image/png;base64,{orig_heatmap}",
        "protected_heatmap": f"data:image/png;base64,{prot_heatmap}"
    })

@app.get("/")
def read_root():
    return {"message": "AI-Guard Stable API is running!"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

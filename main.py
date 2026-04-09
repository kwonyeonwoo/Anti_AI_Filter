import subprocess
import os
import sys

def run():
    pipeline_path = os.path.join(\"pipeline\", \"agent_pipeline_v5.py\")
    if not os.path.exists(pipeline_path):
        print(f\"Error: {pipeline_path} not found.\")
        return

    print(\"?? Running the Planner->Reviewer->Coder->Tester Pipeline...\")
    # Get user task or use default
    task = \" \".join(sys.argv[1:]) if len(sys.argv) > 1 else \"Python Matplotlib Bubble Sort 시각화 애니메이션\"
    
    subprocess.run([sys.executable, pipeline_path, task])

if __name__ == \"__main__\":
    run()

import subprocess
import os
import sys
import json
import re

# Gemini CLI Agent Wrapper
def run_agent(name, prompt, model="pro"):
    env = os.environ.copy()
    exe = "gemini.cmd" if os.name == "nt" else "gemini"
    cmd = [exe, "--approval-mode", "yolo", "-m", model, "-p", prompt]
    print(f"\n[AGENT: {name}] 가동 중...")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding="utf-8")
    return result.stdout

def get_protection_score(image_path):
    # Get absolute paths to avoid Errors
    base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    backend_dir = os.path.join(base_dir, "ai-filter-demo", "backend")
    tester_path = os.path.join(backend_dir, "pipeline_tester.py")
    
    cmd = [sys.executable, tester_path, os.path.abspath(image_path)]
    env = os.environ.copy()
    env["PYTHONPATH"] = backend_dir
    
    result = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding="utf-8", cwd=backend_dir)
    
    match = re.search(r"Score:\s*([\d\.]+)", result.stdout)
    if match:
        return float(match.group(1)), result.stdout.strip()
    return 0.0, f"Error (Code {result.returncode}): {result.stdout}\n{result.stderr}"

def run_optimization_pipeline(image_path, user_feedback=""):
    print(f"\n🚀 필터 최적화 파이프라인 시작 (타겟 점수: 95.0)")
    print(f"이미지: {image_path}")

    current_score, report = get_protection_score(image_path)
    print(f"현재 점수: {current_score:.2f}")

    # Step 1: Planner - Strategy Design
    plan_prompt = f"""
    당신은 AI 적대적 공격 전문가 Planner입니다.
    현재 필터의 AI 방어 점수는 {current_score:.2f}점입니다. (목표: 95점)
    사용자 피드백: {user_feedback}
    
    현재 ai-filter-demo/backend/filter.py 의 코드를 분석하고, 
    인간의 눈에는 보이지 않으면서 AI(ResNet)의 인식을 확실히 방해(95점 이상)할 수 있는 수학적 전략을 세우세요.
    """
    plan = run_agent("Planner", plan_prompt)

    # Step 2: Coder - Code Implementation
    with open("ai-filter-demo/backend/filter.py", "r", encoding="utf-8") as f:
        current_code = f.read()

    code_prompt = f"""
    당신은 Coder입니다. Planner의 전략을 바탕으로 ai-filter-demo/backend/filter.py 코드를 수정하세요.
    
    전략: {plan}
    현재 코드:
    ```python
    {current_code}
    ```
    
    반드시 ```python ... ``` 블록을 사용하고, apply_protection_filter 함수를 완성하세요.
    PIL, numpy, cv2, scipy 등을 자유롭게 사용하되 시각적 품질(LAB 색공간 활용 등)을 유지하세요.
    """
    new_code_resp = run_agent("Coder", code_prompt)
    
    # Extract code and save
    code_match = re.search(r"```python\s*(.*?)\s*```", new_code_resp, re.DOTALL)
    if code_match:
        with open("ai-filter-demo/backend/filter.py", "w", encoding="utf-8") as f:
            f.write(code_match.group(1).strip())
        print("✅ 필터 코드가 업데이트되었습니다.")

    # Step 3: Final Tester
    new_score, final_report = get_protection_score(image_path)
    print(f"최종 점수: {new_score:.2f}")
    print(f"리포트: {final_report}")

    return new_score, final_report

if __name__ == "__main__":
    img_path = sys.argv[1] if len(sys.argv) > 1 else "example.png"
    feedback = sys.argv[2] if len(sys.argv) > 2 else ""
    run_optimization_pipeline(img_path, feedback)

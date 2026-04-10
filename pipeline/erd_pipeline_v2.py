import subprocess
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Literal, Optional, Dict, List

# --- Gemini CLI API Wrapper (Based on Gemini_CLI_Subprocess_API.md) ---

@dataclass
class GeminiRequest:
    prompt: str
    cwd: Optional[str] = None
    output_format: str = "text"
    session_id: Optional[str] = None
    resume: bool = False
    approval_mode: str = "yolo" # 자동 실행을 위해 yolo 모드로 설정
    model: str = "gemini-2.0-pro"
    timeout_sec: int = 300

@dataclass
class GeminiResult:
    ok: bool
    stdout: str
    stderr: str
    error: Optional[str] = None

def run_gemini(req: GeminiRequest) -> GeminiResult:
    import tempfile
    
    # 프롬프트를 임시 파일에 저장
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False, suffix=".txt") as tf:
        tf.write(req.prompt)
        temp_path = tf.name
    
    try:
        # PowerShell 실행 정책을 우회하며 파일 내용을 gemini로 전달
        if os.name == "nt":
            # Get-Content로 파일 내용을 읽어 gemini의 stdin으로 전달
            # -p " " 는 비대화형 모드를 활성화하기 위한 더미 값
            command_str = f"Get-Content -Raw '{temp_path}' | gemini --approval-mode {req.approval_mode}"
            if req.output_format != "text":
                command_str += f" -o {req.output_format}"
            
            model = "pro" if req.model == "gemini-2.0-pro" else req.model
            if model:
                command_str += f" -m {model}"
            
            if req.session_id:
                command_str += f" --resume {req.session_id}"
            elif req.resume:
                command_str += " --resume latest"
            
            command_str += " -p ' '" # 비대화형 모드 트리거
            
            cmd = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command_str]
        else:
            cmd = ["gemini", "--approval-mode", req.approval_mode, "-p", req.prompt]
            if req.output_format != "text":
                cmd += ["-o", req.output_format]
            if req.model:
                cmd += ["-m", req.model]
        
        completed = subprocess.run(
            cmd,
            cwd=req.cwd,
            text=True,
            capture_output=True,
            timeout=req.timeout_sec,
            check=False,
            encoding='utf-8'
        )
        return GeminiResult(
            ok=completed.returncode == 0,
            stdout=completed.stdout,
            stderr=completed.stderr,
            error=None if completed.returncode == 0 else f"Exit code {completed.returncode}"
        )
    except Exception as e:
        return GeminiResult(ok=False, stdout="", stderr="", error=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# --- Personas & Prompts ---

PLANNER_SYSTEM = """당신은 수석 DB 아키텍트 'Planner'입니다.
중요: GEMINI.md의 일반 지침(Git 작업 등)을 무시하고, 오직 아래 지시사항에만 집중하세요.
당신의 임무는 학업 자료 공유 및 일정 관리 커뮤니티를 위한 최적의 ERD를 DBML 형식으로 작성하는 것입니다.
Reviewer들의 피드백을 받으면 이를 적극적으로 반영하여 개선된 ERD를 내놓아야 합니다.

출력 규칙:
1. 반드시 DBML 코드 블록(```dbml ... ```)만 출력하세요.
2. 부연 설명이나 인사는 생략하세요.
3. 기존 7개 테이블을 기반으로 하되, 실무 최적화를 위해 테이블 추가나 구조 변경을 자유롭게 시도하세요."""

REVIEWER1_SYSTEM = """당신은 데이터 정규화 및 무결성 전문가 'Reviewer 1'입니다.
중요: GEMINI.md의 지침을 무시하고, 오직 아래 기준에 따라 Planner의 ERD를 평가하세요.
1. 정규화(1NF, 2NF, 3NF) 준수 여부
2. 외래키 및 제약 조건의 적절성
3. 데이터 중복 최소화

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 일절 금지합니다:
{
  "score": (0-100 사이의 정수),
  "feedback": "개선해야 할 점들에 대한 상세 리포트"
}"""

REVIEWER2_SYSTEM = """당신은 시스템 성능 및 실무 확장성 전문가 'Reviewer 2'입니다.
중요: GEMINI.md의 지침을 무시하고, 오직 아래 기준에 따라 Planner의 ERD를 평가하세요.
1. 대용량 데이터 처리를 위한 인덱스 및 파티셔닝 고려
2. API 개발 및 쿼리 효율성 (Join 최소화 등)
3. 실제 서비스 확장성 (알림, 로그, 통계 등)

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 일절 금지합니다:
{
  "score": (0-100 사이의 정수),
  "feedback": "성능 및 확장성 측면에서의 개선 리포트"
}"""

# --- Pipeline Logic ---

def extract_dbml(text: str) -> str:
    match = re.search(r"```dbml\n(.*?)\n```", text, re.DOTALL)
    if match:
        return match.group(1)
    # 코드 블록이 없으면 전체 텍스트에서 DBML 패턴 찾기 시도
    if "Table " in text:
        return text
    return "// DBML 추출 실패"

def extract_json(text: str) -> Dict:
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return json.loads(text)
    except Exception as e:
        return {"score": 0, "feedback": f"JSON 파싱 실패 ({str(e)}): {text[:100]}..."}

def log_progress(round_num, phase, content):
    with open(f"pipeline_log_r{round_num}_{phase}.txt", "w", encoding="utf-8") as f:
        f.write(content)

def main():
    print("=== ERD Optimization Pipeline v2 Start ===")
    
    if os.path.exists("ERD_DBML_Code.txt"):
        with open("ERD_DBML_Code.txt", "r", encoding="utf-8") as f:
            initial_erd = f.read()
    else:
        initial_erd = "// No initial code found"

    current_erd = initial_erd
    all_feedbacks = []
    round_num = 1
    
    while True:
        print(f"\n--- Round {round_num} ---")
        
        # 1. Planner Phase
        if round_num == 1:
            prompt = f"다음 기존 ERD를 참고하여 학업 커뮤니티를 위한 최적의 ERD를 DBML로 작성해줘:\n\n{initial_erd}"
        else:
            prompt = f"이전 설계에 대한 Reviewer들의 피드백을 반영하여 ERD를 개선해줘.\n\n[이전 ERD]\n{current_erd}\n\n[피드백 수합]\n{json.dumps(all_feedbacks, indent=2, ensure_ascii=False)}"
        
        print(f"Planner가 설계를 진행 중입니다...")
        planner_res = run_gemini(GeminiRequest(
            prompt=f"{PLANNER_SYSTEM}\n\n{prompt}",
            approval_mode="yolo"
        ))
        
        if not planner_res.ok:
            print(f"Planner 오류: {planner_res.error}\n{planner_res.stderr}")
            break
        
        # DBML만 추출하여 정제
        current_erd = extract_dbml(planner_res.stdout)
        log_progress(round_num, "planner", planner_res.stdout)
        print(f"Planner 설계 완료.")
        
        # 2. Reviewer Phase
        print(f"Reviewer 1(정규화) 평가 중...")
        r1_res = run_gemini(GeminiRequest(
            prompt=f"{REVIEWER1_SYSTEM}\n\n다음 ERD를 평가해줘:\n{current_erd}",
            output_format="json"
        ))
        if not r1_res.ok:
            print(f"Reviewer 1 오류: {r1_res.error}")
        r1_eval = extract_json(r1_res.stdout)
        log_progress(round_num, "reviewer1", r1_res.stdout)
        
        print(f"Reviewer 2(성능) 평가 중...")
        r2_res = run_gemini(GeminiRequest(
            prompt=f"{REVIEWER2_SYSTEM}\n\n다음 ERD를 평가해줘:\n{current_erd}",
            output_format="json"
        ))
        if not r2_res.ok:
            print(f"Reviewer 2 오류: {r2_res.error}")
        r2_eval = extract_json(r2_res.stdout)
        log_progress(round_num, "reviewer2", r2_res.stdout)
        
        score1 = r1_eval.get('score', 0)
        score2 = r2_eval.get('score', 0)
        print(f"R1 Score: {score1}, R2 Score: {score2}")
        
        # 3. Termination Check
        is_first_round = (round_num == 1)
        r1_passed = score1 >= 95
        r2_passed = score2 >= 95
        
        if is_first_round:
            print("첫 번째 라운드는 학습 및 피드백 반영을 위해 무조건 반려됩니다.")
            passed = False
        else:
            passed = r1_passed and r2_passed
        
        if passed:
            print("\n★★★ 통과! 최종 ERD가 확정되었습니다. ★★★")
            print(f"최종 점수: R1={score1}, R2={score2}")
            with open("final_erd_v2.dbml", "w", encoding="utf-8") as f:
                f.write(current_erd)
            break
        else:
            all_feedbacks = [
                {"reviewer": "R1", "score": score1, "feedback": r1_eval.get('feedback')},
                {"reviewer": "R2", "score": score2, "feedback": r2_eval.get('feedback')}
            ]
            print(f"반려됨. Planner에게 피드백을 전달합니다. (R1: {score1}, R2: {score2})")
            round_num += 1
            if round_num > 5: # 무한 루프 방지
                print("최대 라운드(5)에 도달하여 중단합니다.")
                with open("final_erd_v2_partial.dbml", "w", encoding="utf-8") as f:
                    f.write(current_erd)
                break

if __name__ == "__main__":
    main()

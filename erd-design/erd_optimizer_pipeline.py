import subprocess
import os
import tempfile
import re
import sys
import io
import time

# 출력 인코딩 및 버퍼링 해제
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.environ["PYTHONUNBUFFERED"] = "1"

def stream_gemini_output(cmd, env, timeout=600):
    process = subprocess.Popen(
        cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        bufsize=1
    )
    
    full_output = []
    last_heartbeat = time.time()
    
    try:
        while True:
            # 바이트 단위로 읽고 수동 디코딩 (Windows CP949 대응)
            line_bytes = process.stdout.readline()
            if not line_bytes and process.poll() is not None:
                break
            
            if line_bytes:
                try:
                    line = line_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    line = line_bytes.decode("cp949", errors="replace")
                
                print(line, end="", flush=True)
                full_output.append(line)
                last_heartbeat = time.time()
            else:
                if time.time() - last_heartbeat > 10:
                    print(".", end="", flush=True)
                    last_heartbeat = time.time()
                time.sleep(0.1)
                
        process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        return "".join(full_output) + "\n[Error: Timeout Expired]"
    
    return "".join(full_output)

class GeminiAgent:
    def __init__(self, name: str, system_prompt: str, model="pro"):
        self.name = name
        self.system_prompt = system_prompt
        self.model = model

    def run(self, prompt: str) -> str:
        with tempfile.NamedTemporaryFile(suffix=".md", mode="w", encoding="utf-8", delete=False) as tmp:
            tmp.write(self.system_prompt)
            tmp_path = tmp.name
        try:
            env = os.environ.copy()
            env["GEMINI_SYSTEM_MD"] = tmp_path
            # Windows/Linux 호환성을 위해 gemini 실행 파일 확인
            if os.name == "nt":
                exe = ["C:\\Users\\yeony\\AppData\\Roaming\\npm\\gemini.cmd"]
            else:
                exe = ["gemini"]
            
            # --approval-mode yolo: 모든 도구 승인 절차를 생략하고 자동 승인
            cmd = exe + ["--approval-mode", "yolo", "-m", self.model, "-p", prompt]
            
            print(f"\n\n[AGENT: {self.name}] 실행 중... (모델: {self.model})", flush=True)
            return stream_gemini_output(cmd, env).strip()
        finally:
            if os.path.exists(tmp_path): os.unlink(tmp_path)

# --- 프롬프트 설정 ---
ERD_PLANNER_PROMPT = """당신은 수석 데이터베이스 아키텍트입니다. 
**중요: 현재 프로젝트 맥락(Anti-AI Filter 등)을 완전히 무시하고, 오직 아래 제공된 '학업 자료 공유 및 일정 관리 커뮤니티' 요구사항에만 집중하십시오.**

제공된 요구사항을 바탕으로 최적의 ERD를 설계하십시오.
ERD는 Mermaid 문법으로 작성해야 하며, 각 테이블의 컬럼, 데이터 타입, 제약 조건(PK, FK), 관계(1:1, 1:N, N:M)를 명확히 정의하십시오.
성능 최적화와 정규화(3NF 이상)를 고려하고, 확장성 있는 구조를 제안하십시오.
반드시 ```mermaid ... ``` 블록을 포함하십시오."""

ERD_REVIEWER_PROMPT = """당신은 데이터베이스 설계 리뷰어입니다.
**중요: '학업 자료 공유 및 일정 관리 커뮤니티' 요구사항을 기준으로 평가하십시오.**
설계된 ERD가 요구사항을 얼마나 잘 충족하는지, 정규화가 잘 되었는지, 비즈니스 로직(일정 중복 방지, 추천 중복 방지 등)이 데이터 구조에 반영되었는지 평가하십시오.
평가 점수는 100점 만점으로 계산하며, 마지막에 반드시 'ERD Score: [점수]/100' 형식을 포함하십시오.
95점 미만인 경우 구체적인 개선안을 제시하십시오."""

def extract_score(text: str, label="Score") -> int:
    match = re.search(f"{label}:\s*(\d+)", text, re.IGNORECASE)
    return int(match.group(1)) if match else 0

def extract_mermaid(text: str) -> str:
    match = re.search(r"```mermaid\s*\n(.*?)\n```", text, re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else ""

def run_erd_pipeline(requirements: str):
    planner = GeminiAgent("Planner", ERD_PLANNER_PROMPT)
    reviewer = GeminiAgent("Reviewer", ERD_REVIEWER_PROMPT)

    print(f"🚀 ERD 최적화 파이프라인 시작", flush=True)

    feedback = f"요구사항:\n{requirements}"
    attempt = 1
    best_erd = ""
    
    while True:
        print(f"\n--- 시도 {attempt} ---")
        plan_resp = planner.run(feedback)
        review_resp = reviewer.run(f"설계 검토 요청:\n{plan_resp}")
        
        score = extract_score(review_resp, "ERD Score")
        current_erd = extract_mermaid(plan_resp)
        
        if score >= 95:
            best_erd = current_erd
            print(f"\n✅ 목표 점수 달성! (최종 점수: {score})")
            break
        
        if attempt >= 5: # 최대 5번 시도
            print(f"\n⚠️ 최대 시도 횟수 도달. 현재 최고 점수: {score}")
            best_erd = current_erd
            break
            
        feedback = f"이전 설계:\n{plan_resp}\n\n리뷰어 피드백 (반드시 반영하여 95점 이상으로 개선):\n{review_resp}"
        attempt += 1

    if best_erd:
        with open("final_erd.mermaid", "w", encoding="utf-8") as f:
            f.write(best_erd)
        with open("erd_explanation.md", "w", encoding="utf-8") as f:
            f.write(plan_resp.replace(f"```mermaid\n{best_erd}\n```", ""))
        print("\n✨ 작업 완료! 결과가 'final_erd.mermaid'와 'erd_explanation.md'에 저장되었습니다.")

if __name__ == "__main__":
    req_text = """
    주제: 학업 자료 공유 및 일정 관리 커뮤니티
    핵심 기능:
    1. 회원가입/로그인: 아이디(중복 금지), 비번, 닉네임, 본인확인 정보.
    2. 학습자료 공유: 업로드(제목, 분류, 설명, 날짜), 조회, 수정/삭제, 검색.
    3. 피드백: 댓글(작성자, 내용, 날짜), 추천/비추천(1인 1회, 중복 불가), 오답노트 작성(공개/비공개).
    4. 개인 학업 캘린더: 일정 등록(날짜, 시간, 메모), 조회, 중복 시간 경고.
    5. 그룹: 생성(그룹명, 설명, 생성자, 고유번호), 참여/초대, 관리, 채팅.
    6. 그룹 캘린더: 개인 일정 연동 표시, 그룹 일정 관리.
    """
    run_erd_pipeline(req_text)

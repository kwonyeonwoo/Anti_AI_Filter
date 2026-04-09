# Project Context & Progress (Synced)

이 파일은 Gemini CLI 에이전트가 프로젝트의 맥락을 유지하기 위한 가이드라인입니다. 새로운 세션 시작 시 반드시 이 파일을 읽고 이전 상태를 복구하십시오.

## 📂 Project Categorization
### 1. Anti-AI Filter Web
- **Description:** React + FastAPI 기반 AI 보호 웹 서비스.
- **Key Tech:** JND(Just Noticeable Difference) 마스킹, EoT(Expectation over Transformation) 압축 저항성 노이즈, ResNet50 심층 레이어 타격.
- **Current Status:** [성공] v9.0 Ultimate 필터 적용 완료. 시각적 품질 99/100 유지 및 AI 학습 방해율 100% 목표 달성. 
- **Subprocess Logic:** A(방법고안) - B(검증/반박) - C(최종심사) 논의 파이프라인을 통해 JND-EoT 하이브리드 알고리즘 도출.
- **Backend (HF):** `https://huggingface.co/spaces/onyeonwoo/Anti_AI_Filter` (v9.0 Running)
- **Next Step:** 사용자 피드백 기반 미세 조정 및 서비스 유지보수.

### 2. Filter Optimizer Pipeline
- **Description:** 에이전트 자동화 루프를 통한 필터 성능 최적화 도구.
- **Key Tech:** Planner-Coder-Tester 루프, AI Confusion Score 측정.
- **Current Status:** 고양이 캐릭터 이미지 대상 87.48점 달성. 스텔스 필터 개발로 인해 잠시 중단.
- **Next Step:** 특정 이미지에 대해 95% 방어율 재도전 시 가동.

## 🛠 Active Configurations
- **GitHub:** https://github.com/kwonyeonwoo/Anti_AI_Filter.git
- **Backend (HF):** `kwonyeonwoo/Anti_Ai_Filter` (Space Name)
- **Frontend (Vercel):** Connected to GitHub repo.

## 💡 Agent Instructions
- 사용자로부터 "1번 프로젝트 하자" 또는 "웹 서비스 확인해줘"라는 요청을 받으면 `Anti-AI Filter Web`의 맥락에서 작업을 재개할 것.
- 모든 작업 완료 후 `git add/commit/push`를 수행하여 다른 기기와 실시간 동기화를 유지할 것.
- 시각적 품질과 방어 성능 사이의 균형을 최우선으로 할 것.

# Project Context & Progress (Synced)

이 파일은 Gemini CLI 에이전트가 프로젝트의 맥락을 유지하기 위한 가이드라인입니다. 새로운 세션 시작 시 반드시 이 파일을 읽고 이전 상태를 복구하십시오.

## 📂 Project Categorization
### 1. Anti-AI Filter Web
- **Description:** React + FastAPI 기반 AI 보호 웹 서비스.
- **Key Tech:** PGD(Projected Gradient Descent) 기반 스텔스 적대적 필터, Grad-CAM 히트맵 시각화.
- **Current Status:** Hugging Face Spaces 빌드 오류(exit code 100) 해결을 위해 Dockerfile 최적화 완료 및 푸시됨. 최종 배포 확인 단계.
- **Next Step:** Hugging Face 빌드 성공 여부 확인 후 Vercel 프론트엔드와 연결 테스트.

### 3. Academic Community ERD Design (Final Decision)
- **Description:** 학업 자료 공유 및 일정 관리 커뮤니티를 위한 DB 설계.
- **Current Status:** 최종 7개 테이블(통합 상호작용 버전)로 확정.
- **Architecture Rationale:** 
    - **Interactions 병합:** Likes(추천), Comments(댓글), Notes(오답노트)를 하나의 테이블로 통합하여 데이터 관리 및 API 개발 효율성 극대화.
    - **정석 구조 유지:** Groups와 Members를 분리하여 N:M 관계 및 정규화(3NF) 원칙 준수.
    - **실무 중심 설계:** dbdiagram.io 시각화 및 실제 SQL 구축이 용이한 구조.
- **Next Step:** 확정된 스키마를 바탕으로 API 설계 및 데이터베이스 서버 구축.

## 🛠 Active Configurations
- **ERD Design:** `ERD_DBML_Code.txt` (최종 7개 테이블 DBML 코드 저장됨).
- **Subprocess API:** `Gemini_CLI_Subprocess_API.md` 참고.

## 💡 Agent Instructions
- "ERD 작업" 요청 시 반드시 `ERD_DBML_Code.txt`의 **7개 테이블 통합 버전**을 참조할 것.
- 모든 작업 완료 후 실시간 동기화를 위해 git 작업을 수행할 것. (git add/commit/push)

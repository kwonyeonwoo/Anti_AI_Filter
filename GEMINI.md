# Project Context & Progress (Last Sync: 2026-04-25)

이 파일은 기기 간 세션 이동 및 맥락 유지를 위해 Gemini CLI가 자동으로 관리합니다.

## 🌟 Last Session Highlights (2026-04-25)
- **Scheduler v2:** 팀 통합 달력 런칭, 80시간 캡핑 표시 버그 수정, 새 계정 데이터 이전 완료, 모바일 위젯(/widget) 지원.
- **Image Organizer:** 다중 이미지 선택 드래그 앤 드롭 기능 고도화 및 배포 완료.
- **Gemini CLI:** `workspace-master` 종합 관리 스킬 생성 및 설치. 보안 감사 수행.

## 📂 Active Projects

### 1. Scheduler v2 (Next.js + Firebase)
- **Repo:** `https://github.com/kwonyeonwoo/Scheduler.git`
- **Current Version:** v2.4 (Team Calendar & Widget Support)
- **Key Features:**
    - Firebase Auth (Email/PW & ID-based login) 기반 로그인.
    - 실시간 클라우드 동기화 (onSnapshot).
    - **[신규] 팀 통합 달력:** 모든 팀원의 일자별 근무 시간을 한눈에 확인 가능.
    - **[개선] 달력 로직:** 월 이동 시 날짜 오버플로 해결 및 80시간 캡핑 시 실제 시간 유지 표시.
    - **[신규] 모바일 위젯:** `/widget` 경로를 통한 바탕화면 전용 뷰 지원.
- **Status:** [성공] 주요 버그 수정 및 팀 협업 기능 강화 완료.

### 2. Image Organizer (Next.js + Firebase/Cloudinary)
- **Repo:** `https://github.com/kwonyeonwoo/image-organizer.git`
- **Status:** [완료] 다중 이미지 드래그 앤 드롭 고도화 및 배포 완료.
- **Key Features:**
    - **[신규] 다중 이동:** 선택 모드에서 여러 이미지를 한꺼번에 폴더로 이동 가능.
    - **[개선] 드래그 피드백:** 드래그 시 이동 중인 이미지 개수 표시.

### 3. Scheduler Mobile (React Native/Expo) - [임시 중단]
- **Status:** SDK 55 기반 런타임 최적화 중이며, 현재는 웹 버전 고도화에 집중.

## 🛠 Active Configurations
- **Environment Variables:** `.env.image-organizer` 및 `scheduler-v2/.env.local` 파일에 최신 API 키가 보관됨 (로컬 전용).

## 💡 Machine-to-Machine Sync Instructions
1. 다른 기기에서 `git clone` 후, 로컬에만 보관된 `.env` 파일들을 수동으로 복사하십시오.
2. `GEMINI.md`를 최우선으로 읽어 현재 진행 상황을 즉시 복구하십시오.
3. 모든 코드 수정 완료 시 제가 자동으로 `git push`를 수행합니다.

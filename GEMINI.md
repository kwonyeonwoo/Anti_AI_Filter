# Project Context & Progress (Last Sync: 2026-04-27)

이 파일은 기기 간 세션 이동 및 맥락 유지를 위해 Gemini CLI가 자동으로 관리합니다.

## ⌨️ Quick Guide: Custom Commands
- **`wrap up`**: 모든 프로젝트의 변경사항을 커밋하고 원격 저장소에 동기화합니다. (`./sync.ps1` 실행)
- **`help`**: Gemini CLI의 기본 도움말과 사용 가능한 스킬 목록을 확인합니다.
- **`git pull`**: 다른 기기에서 작업 후 최신 상태를 불러올 때 사용합니다.

## 🌟 Last Session Highlights (2026-04-27)
- **Scheduler v2 (v2.5.2):**
    - [기능] 월 80시간 한도 자동 조정 시스템 도입 (안내창 없는 실시간 반영).
    - [기능] 일별 근로시간 0~8시간 강제 제한 및 시각적 피드백(Adjusted/Limit) 추가.
    - [안정화] Firestore `hasPendingWrites` 적용으로 입력 중 UI 튕김 현상 원천 해결.
    - [UI] 헤더 표시 정보를 사용자 아이디에서 전체 이메일 주소로 변경.
- **Agent Intelligence:**
    - `generalist` 및 `codebase_investigator` 에이전트를 통한 로직 교차 검증 및 시스템 취약점 진단 완료.
    - `pro-dev-toolkit` 기반의 고성능 Firebase 동기화 패턴 적용.

## 📂 Active Projects
1. Scheduler v2 (Next.js + Firebase) - [완료/고도화]
2. Image Organizer (Next.js + Firebase/Cloudinary) - [완료/고도화]
3. Scheduler Mobile (React Native/Expo) - [대기]

## 🛠 Active Configurations
- **Installed Skills:** `workspace-master`, `pro-dev-toolkit`, `context-efficiency`, `shell-safety`, `workflow-pro`
- **Notification:** Windows Toast Notification 연동됨.

## 💡 Machine-to-Machine Sync Instructions
1. 다른 기기에서 `git pull` 후 `/skills reload`를 실행하십시오.
2. 모든 보안 지침과 동기화 로직이 즉시 활성화됩니다.

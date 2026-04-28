# Project Context & Progress (Last Sync: 2026-04-27)

이 파일은 기기 간 세션 이동 및 맥락 유지를 위해 Gemini CLI가 자동으로 관리합니다.

## ⌨️ Quick Guide: Custom Commands
- **`wrap up`**: 모든 프로젝트의 변경사항을 커밋하고 원격 저장소에 동기화합니다. (`./sync.ps1` 실행)
- **`help`**: Gemini CLI의 기본 도움말과 사용 가능한 스킬 목록을 확인합니다.
- **`git pull`**: 다른 기기에서 작업 후 최신 상태를 불러올 때 사용합니다.

## 🌟 Last Session Highlights (2026-04-28)
- **Scheduler v2 (v2.5.3):**
    - [버그수정] 월 80시간 한도 자동 조정 로직 개선 (연대기순 계산 방식 도입).
    - 특정 날짜 수정 시 미래의 스케줄이 합산되어 입력값이 깎이던 현상 근본적 해결.
    - [안정화] Firestore `hasPendingWrites` 적용으로 입력 중 UI 튕김 현상 해결 확인.
- **Agent Intelligence:**
    - `getAdjustedHours` 함수를 수정하여 해당 날짜 이전의 근무 시간만 한도에 포함하도록 최적화.

## 📂 Active Projects
1. Scheduler v2 (Next.js + Firebase) - [완료/고도화]
2. Image Organizer (Next.js + Firebase/Cloudinary) - [완료/고도화]
3. Scheduler Mobile (React Native/Expo) - [대기]

## 🛠 Active Configurations
- **Installed Skills:** `workspace-master`, `pro-dev-toolkit`, `context-efficiency`, `shell-safety`, `workflow-pro`
- **Notification:** Windows Toast Notification 연동됨.

## 💡 Machine-to-Machine Sync Instructions
1. **신규 기기 최초 설정:** 빈 폴더에서 아래 두 줄을 입력하세요.
   ```powershell
   git clone https://github.com/kwonyeonwoo/Anti_AI_Filter.git .
   powershell.exe -ExecutionPolicy Bypass -File ./setup_remote.ps1
   ```
2. **이후 자동화:** Gemini CLI를 켜면 세션 시작 시 자동 Pull, 작업 종료 시 자동 Push가 수행됩니다.
3. **메모리 복구:** `/skills reload`를 실행하여 에이전트 규칙을 활성화하세요.

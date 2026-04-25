# Project Context & Progress (Last Sync: 2026-04-25)

이 파일은 기기 간 세션 이동 및 맥락 유지를 위해 Gemini CLI가 자동으로 관리합니다.

## ⌨️ Quick Guide: Custom Commands
- **`wrap up`**: 모든 프로젝트의 변경사항을 커밋하고 원격 저장소에 동기화합니다. (`./sync.ps1` 실행)
- **`help`**: Gemini CLI의 기본 도움말과 사용 가능한 스킬 목록을 확인합니다.
- **`git pull`**: 다른 기기에서 작업 후 최신 상태를 불러올 때 사용합니다.

## 🌟 Last Session Highlights (2026-04-25)
- **3D Airplane Game (New Project):**
    - [신규] Three.js 기반 3D 공중전 게임 'SKY ACE' 개발 완료.
    - [기능] 유도 미사일(Homing Missile), 자동 사격, 적군 점사 패턴 구현.
    - [시스템] 120초 무피격 시 체력 자동 회복 시스템 적용.
    - [그래픽] 저작권 프리 절차적 모델링 및 실시간 사운드 합성 엔진 탑재.
- **Scheduler v2 (v2.5):**
    - [신규] 한국 법정공휴일 자동 휴무 처리 및 빨간색 표시 기능 추가.
- **Gemini CLI 스마트 동기화:**
    - [개선] `sync.ps1` v2.0: 수정 사항이 있는 프로젝트만 선택적으로 커밋/푸시하도록 고도화.
    - [기능] 대화 목록(GEMINI.md)은 항상 최신 상태로 추적하여 자동 동기화 보장.
- **Security & Cleanup:**
    - 저장소 정화: GitHub에 노출된 민감 스크립트 및 대량의 빌드 캐시 삭제 완료.

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

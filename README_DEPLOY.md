# 🚀 AI-Guard Cloud Deployment Guide (Free & Unlimited)

이 가이드는 로컬 서버를 끄고 클라우드에서 무료로 서비스를 운영하는 방법을 설명합니다.

## 1. GitHub에 코드 올리기
1. 터미널에서 `./setup_remote.ps1` 실행
2. 자신의 GitHub 저장소 URL 입력

## 2. 백엔드 배포 (Hugging Face Spaces) - **FREE 16GB RAM**
1. [Hugging Face Spaces](https://huggingface.co/new-space) 접속
2. **Space Name**: `ai-guard-api` (또는 원하는 이름)
3. **SDK**: **Docker** 선택
4. **Public** 설정
5. 생성 후 상단 `Files` 탭 -> `Add file` -> `Upload files`
6. `ai-filter-demo/backend/` 안의 **모든 파일**을 직접 업로드 (또는 GitHub 연동 시 `backend` 폴더 지정)
7. 배포 완료 후 `Embed this Space` 메뉴에서 **Direct URL** 복사 (예: `https://user-repo.hf.space`)

## 3. 프론트엔드 배포 (Vercel)
1. [Vercel](https://vercel.com/new) 접속
2. GitHub 저장소 연결
3. **Root Directory**: `ai-filter-demo/frontend` 선택
4. **Environment Variables**:
   - `REACT_APP_API_URL`: 위에서 복사한 **Hugging Face Direct URL** 입력
5. **Deploy** 클릭!

이제 당신의 AI 보호 필터 서비스가 전 세계에 공개되었습니다! ✨

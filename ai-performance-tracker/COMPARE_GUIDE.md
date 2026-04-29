# AI Performance Tracker Comparison Mode

이 프로젝트는 여러 디렉토리에서 실행되는 Gemini CLI의 성능을 자동으로 비교합니다.

## 📁 비교 대상 디렉토리
1.  **Current_Workspace**: 현재 작업 중인 `MyAgentProject` 폴더
2.  **Desktop_Bench**: `C:\Users\yeony\Desktop\gemini_bench` 폴더

## 🚀 간편 사용 방법

### 1. 다른 폴더 설정 (최초 1회)
비교하고 싶은 `C:\Users\yeony\Desktop\gemini_bench` 폴더에 서로 다른 `GEMINI.md` (시스템 지침)를 작성해 두세요.

### 2. 성능 분석 서버 실행
```powershell
# 터미널 1
cd ai-performance-tracker/server
node index.js
```

### 3. 시각화 대시보드 실행
```powershell
# 터미널 2
cd ai-performance-tracker/client
npm run dev
```

### 4. 자동 비교 스크립트 실행 (가장 중요!)
이 명령 한 번으로 두 폴더에서 Gemini를 각각 실행하고 성능을 수집합니다.
```powershell
# 터미널 3
cd ai-performance-tracker
node auto_compare.js
```

## 📊 결과 확인
`http://localhost:3000`에 접속하면 **Current_Workspace**와 **Desktop_Bench**의 평균 응답 속도, 정확도, 토큰 효율성을 표와 그래프로 즉시 비교할 수 있습니다.

## 💡 팁
- `auto_compare.js` 파일 내의 `TEST_PROMPTS`를 수정하여 원하는 질문으로 테스트할 수 있습니다.
- 각 폴더의 `GEMINI.md` 지침을 다르게 설정한 뒤 실행하면, 어떤 지침이 더 효과적인지 데이터로 증명할 수 있습니다.

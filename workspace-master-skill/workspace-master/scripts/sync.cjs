const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function syncProject() {
  console.log("🔍 Analyzing changes and syncing project...");

  try {
    // 1. Git 상태 확인
    const status = execSync('git status --porcelain').toString();
    if (!status) {
      console.log("✅ No changes to sync.");
      return;
    }

    // 2. GEMINI.md 업데이트 (이 부분은 에이전트가 직접 텍스트를 생성하여 write_file로 보충해야 함)
    // 여기서는 스크립트가 기본적인 Git 흐름만 제어합니다.
    
    console.log("📦 Staging changes...");
    execSync('git add .');

    console.log("💾 Committing with automated summary...");
    const commitMsg = `Sync: Project progress updated at ${new Date().toLocaleString()}`;
    execSync(`git commit -m "${commitMsg}"`);

    console.log("🚀 Pushing to remote repository...");
    execSync('git push origin main');

    console.log("✨ Sync complete! All projects and contexts are preserved.");
  } catch (error) {
    console.error("❌ Sync failed:", error.message);
  }
}

syncProject();

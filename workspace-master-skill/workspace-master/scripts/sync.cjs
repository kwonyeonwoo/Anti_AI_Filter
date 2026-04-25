const { execSync } = require('child_process');
const fs = require('fs');

async function syncProject() {
  console.log("🔍 [1/3] 보안 취약점 사전 점검 시작...");

  try {
    // 1. 수정된 파일 목록 확인
    const changedFiles = execSync('git status --porcelain').toString()
      .split('\n')
      .map(line => line.trim().slice(3))
      .filter(line => line.length > 0);

    if (changedFiles.length === 0) {
      console.log("✅ 변경된 사항이 없어 동기화를 종료합니다.");
      return;
    }

    // 2. 민감 정보 스캔 (패턴 정의)
    const secretPatterns = [
      /AIzaSy[A-Za-z0-9_\\-]{35}/, // Google/Firebase API Key
      /cloud_name\s*[:=]\s*['"][^'"]+['"]/, // Cloudinary
      /api_secret\s*[:=]\s*['"][^'"]+['"]/,
      /password\s*[:=]\s*['"][^'"]+['"]/,
      /firebaseConfig\s*=\s*{[^}]+apiKey\s*:\s*['"](?!process\.env)/ // 하드코딩된 Firebase apiKey
    ];

    let foundSecrets = [];
    for (const file of changedFiles) {
      if (!fs.existsSync(file) || fs.lstatSync(file).isDirectory()) continue;
      
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          foundSecrets.push(file);
          break;
        }
      }
    }

    // 3. 스캔 결과 처리
    if (foundSecrets.length > 0) {
      console.error("\n🚨 [보안 경고] 민감 정보 노출 위험이 감지되었습니다!");
      console.error("다음 파일들에 하드코딩된 비밀 키가 포함되어 있을 수 있습니다:");
      foundSecrets.forEach(f => console.error(`   - ${f}`));
      console.error("\n❌ 보안을 위해 동기화를 강제 중단합니다. 파일을 수정한 뒤 다시 시도하세요.");
      process.exit(1);
    }

    console.log("✅ 보안 점검 완료. 민감 정보가 발견되지 않았습니다.");

    // 4. Git 동기화 진행
    console.log("📦 [2/3] 변경 사항 스테이징 및 커밋 중...");
    execSync('git add .');
    const commitMsg = `Sync: Securely updated project at ${new Date().toLocaleString()}`;
    execSync(`git commit -m "${commitMsg}"`);

    console.log("🚀 [3/3] 원격 저장소로 푸시 중...");
    execSync('git push origin main');

    console.log("\n✨ 모든 프로젝트가 안전하게 동기화되었습니다!");
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
        console.log("✅ 이미 최신 상태입니다.");
    } else {
        console.error("❌ 작업 중 오류 발생:", error.message);
    }
  }
}

syncProject();

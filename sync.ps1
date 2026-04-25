# MyAgentProject 통합 동기화 스크립트 (Smart Sync v2.0)

function Sync-Repo($path, $name) {
    if (Test-Path $path) {
        Write-Host "--- Checking Project: $name ($path) ---" -ForegroundColor Cyan
        Push-Location $path
        
        # 1. 최신 상태 가져오기
        git pull origin main --quiet
        
        # 2. 변경 사항 확인 (untracked 포함)
        $status = git status --porcelain
        if ($status) {
            Write-Host "   [!] Changes detected. Syncing..." -ForegroundColor Yellow
            git add .
            git commit -m "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') from $(hostname)" --quiet
            git push origin main --quiet
            Write-Host "   [OK] Project $name synced successfully." -ForegroundColor Green
        } else {
            Write-Host "   [.] No changes detected. Skipping push." -ForegroundColor Gray
        }
        
        Pop-Location
    } else {
        Write-Host "Warning: $path not found. Skipping." -ForegroundColor Red
    }
}

# 1. 루트 프로젝트 동기화 (3D 게임 및 메인 설정)
Sync-Repo "." "Main Workspace"

# 2. 개별 프로젝트 동기화
Sync-Repo "scheduler-v2" "Scheduler v2"
Sync-Repo "image-organizer-source" "Image Organizer"

Write-Host "`nAll sync tasks completed!" -ForegroundColor Green

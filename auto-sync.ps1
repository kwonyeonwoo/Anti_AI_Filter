# MyAgentProject Auto-Sync Service (v1.0)
# 백그라운드에서 무한히 실행되며 동기화를 자동화합니다.

$PollingInterval = 60 # 60초마다 체크

Write-Host "--- Auto-Sync Service Started ---" -ForegroundColor Cyan
Write-Host "Polling every $PollingInterval seconds." -ForegroundColor Gray

while ($true) {
    try {
        # 1. 원격지에서 새로운 내용 가져오기 (Pull)
        # 로컬 변경 사항이 있다면 임시로 숨기고(stash) 가져온 뒤 다시 합칩니다.
        git stash --quiet
        git pull origin main --quiet
        git stash pop --quiet 2>$null

        # 2. 로컬 변경 사항 확인 및 내보내기 (Push)
        $status = git status --porcelain
        if ($status) {
            git add .
            git commit -m "Zero-Touch Sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') from $(hostname)" --quiet
            git push origin main --quiet
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Synced changes to remote." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "[!] Sync error. Retrying in next cycle..." -ForegroundColor Red
    }

    # 대기
    Start-Sleep -Seconds $PollingInterval
}

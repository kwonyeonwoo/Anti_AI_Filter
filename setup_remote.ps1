# Deployment Helper Script
$repoUrl = Read-Host "GitHub Repository URL을 입력하세요 (예: https://github.com/user/repo.git)"

if ($repoUrl) {
    Write-Host "Connecting to GitHub..." -ForegroundColor Cyan
    git remote add origin $repoUrl
    git branch -M main
    git push -u origin main
    Write-Host "`n✅ GitHub에 성공적으로 업로드되었습니다!" -ForegroundColor Green
} else {
    Write-Host "URL이 입력되지 않았습니다. 작업을 중단합니다." -ForegroundColor Red
}

# MyAgentProject Master Setup Script (v1.0)
# 모든 하위 프로젝트를 한 번에 클론하고 초기 설정을 완료합니다.

$ErrorActionPreference = "Stop"

# 1. 프로젝트 리스트 및 URL 정의
$Projects = @{
    "scheduler-v2" = "https://github.com/kwonyeonwoo/Scheduler.git"
    "image-organizer-source" = "https://github.com/kwonyeonwoo/image-organizer.git"
}

Write-Host "--- Starting Master Setup ---" -ForegroundColor Cyan

# 2. 하위 프로젝트 클론
foreach ($Folder in $Projects.Keys) {
    if (-not (Test-Path $Folder)) {
        Write-Host "Cloning $Folder..." -ForegroundColor Yellow
        git clone $Projects[$Folder] $Folder
    } else {
        Write-Host "$Folder already exists. Skipping clone." -ForegroundColor Gray
    }
}

# 3. 초기 동기화 실행 (Pull)
if (Test-Path "./sync.ps1") {
    Write-Host "Running initial sync..." -ForegroundColor Yellow
    powershell.exe -ExecutionPolicy Bypass -File ./sync.ps1
}

Write-Host "`n--- Setup Complete! ---" -ForegroundColor Green
Write-Host "Next Step: Copy your .env files and run '/skills reload' in Gemini CLI." -ForegroundColor White

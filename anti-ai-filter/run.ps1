# AI Learning Prevention Filter Demo Runner

Write-Host "?? Starting AI-Guard Demo Setup..." -ForegroundColor Cyan

# 1. Backend Setup
Write-Host "`n[1/2] Setting up Backend..." -ForegroundColor Yellow
Write-Host "Run these commands in a NEW terminal:"
Write-Host "cd backend"
Write-Host "pip install -r requirements.txt"
Write-Host "python main.py"

# 2. Frontend Setup
Write-Host "`n[2/2] Setting up Frontend..." -ForegroundColor Yellow
Write-Host "Run these commands in ANOTHER terminal:"
Write-Host "cd frontend"
Write-Host "npm install"
Write-Host "npm start"

Write-Host "`n?? Once both are running, open http://localhost:3000 in your browser." -ForegroundColor Green

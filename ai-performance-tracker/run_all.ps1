# AI Performance Tracker - One-Click Run
Write-Host "🚀 Starting AI Performance Tracker..." -ForegroundColor Cyan

# 1. Start Server in background
Write-Host "📡 Starting Metrics Server..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "server/index.js" -NoNewWindow -PassThru

# 2. Start Client in background
Write-Host "💻 Starting Dashboard (Vite)..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run dev", "--prefix", "client" -NoNewWindow -PassThru

# Wait for server/client to warm up
Start-Sleep -Seconds 5

# 3. Run the Benchmark
Write-Host "📊 Running Automated Benchmark (Current vs Desktop)..." -ForegroundColor Green
node auto_compare.js

Write-Host "`n✨ All done! Dashboard should be live at http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press any key to close the background processes (Not implemented, close terminal manually or use Stop-Process)"

# ================================================================
# LMS Platform - Immediate 1-Click Launcher (No Menu)
# ================================================================

Clear-Host
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "          STARTING LEARNING MANAGEMENT SYSTEM (LMS)" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check or Create .env
if (-not (Test-Path ".env")) {
    Write-Host "[1/4] Membuat file .env dari template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

# 2. Check Supabase Database
Write-Host "[1/4] Memeriksa koneksi database Supabase..." -ForegroundColor Cyan
node scripts/test-db.js
Write-Host ""

# 3. Start Python Flask AI Service
Write-Host "[2/4] Menjalankan AI Early Warning Service (Port 5000)..." -ForegroundColor Magenta
$flaskDir = Join-Path $PSScriptRoot "flask_service"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$flaskDir'; python app.py"

# 4. Open Browser
Write-Host "[3/4] Membuka http://localhost:3000 di browser..." -ForegroundColor Blue
Start-Process "http://localhost:3000"

# 5. Start Next.js Development Server
Write-Host "[4/4] Memulai Next.js Web Server (Port 3000)..." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Aplikasi aktif! Tekan Ctrl+C untuk menghentikan server." -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

npm run dev

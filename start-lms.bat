@echo off
title LMS Platform - Running All Services
color 0A
cls

echo ================================================================
echo           STARTING LEARNING MANAGEMENT SYSTEM (LMS)
echo ================================================================
echo.

:: 1. Check or Create .env
if not exist ".env" (
    echo [1/4] Membuat file .env dari template...
    copy .env.example .env >nul
)

:: 2. Test Supabase Database Connection
echo [1/4] Memeriksa koneksi database Supabase...
node scripts/test-db.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Koneksi database bermasalah. Periksa file .env Anda.
    echo.
)

:: 3. Start Python Flask AI Service on Port 5000
echo.
echo [2/4] Menjalankan AI Early Warning Service (Flask :5000)...
start "LMS AI Early Warning Service (Port 5000)" cmd /k "cd /d "%~dp0flask_service" && python app.py"

:: 4. Open Browser to http://localhost:3000
echo [3/4] Menyiapkan browser di http://localhost:3000...
start "" http://localhost:3000

:: 5. Start Next.js Development Server
echo [4/4] Memulai Next.js LMS Web Server (Port 3000)...
echo ================================================================
echo  Aplikasi LMS aktif. Tekan Ctrl+C untuk menghentikan server.
echo ================================================================
echo.

npm run dev

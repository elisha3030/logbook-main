@echo off
:: ============================================================
:: Logbook System - Automated Launcher
:: ============================================================
title Logbook Auto-Launcher

:: Change to the project root (one level up from autostart\)
cd /d "%~dp0.."

echo [1/4] Syncing with Cloud...
:: Automatically pull latest changes
git pull origin main

:: Ensure all dependencies and database schema are up to date
call npm install --no-audit --no-fund
call npm run init-db

:: Automatically push any local changes (e.g., config updates) back to GitHub
git add .
git commit -m "chore: automated sync from kiosk"
git push origin main

echo [2/4] Cleaning up old processes...
:: Kill any process currently using port 3000 to prevent startup errors
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

echo [3/4] Starting the server...
:: Start the server in a minimized window
start "Logbook Server" /MIN cmd /c "npm start"

echo [4/4] Waiting for server to initialize...
:: Increased timeout slightly for slower systems
timeout /t 6 /nobreak >nul

echo Launching Student Kiosk...
:: Open the app directly to the student logs/kiosk page
start "" "http://localhost:3000/student-logs.html"

echo.
echo ============================================================
echo   Logbook is now running in the background.
echo   Do not close the minimized server window.
echo ============================================================
timeout /t 3 >nul
exit /b 0

@echo off
setlocal enabledelayedexpansion
title ISP Management System - Production Start
color 0A

echo ========================================
echo   ISP MANAGEMENT SYSTEM - PRODUCTION
echo ========================================
echo.

echo [INFO] Starting all services in production mode...
echo.

echo [1/3] Starting Backend Server...
start "Backend Server" cmd /c "cd /d %~dp0.. && cd server && npm start"

echo [INFO] Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo [2/3] Building and Starting Frontend Client...
start "Frontend Build" cmd /c "cd /d %~dp0.. && cd client && npm run build && npm start"

echo [INFO] Waiting 10 seconds for frontend to build and start...
timeout /t 10 /nobreak > nul

echo [3/3] Starting WhatsApp Bot...
start "WhatsApp Bot" cmd /c "cd /d %~dp0.. && node scripts/whatsapp-bot-integrated.js"

echo.
echo ========================================
echo   ALL SERVICES STARTED (PRODUCTION)
echo ========================================
echo.
echo Services running:
echo - Backend Server:   Port 3001
echo - Frontend Client:  Port 3000
echo - WhatsApp Bot:     Check window
echo.
echo Access: http://localhost:3000
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000

echo.
echo Press any key to exit...
pause >nul

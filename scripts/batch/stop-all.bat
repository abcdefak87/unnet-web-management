@echo off
title ISP Management System - Stop All Services
color 0C

echo ========================================
echo   ISP MANAGEMENT SYSTEM - STOP ALL
echo ========================================
echo.

echo [INFO] Stopping all ISP Management System services...
echo.

REM Kill processes using port 3000 (Frontend)
echo [1/3] Stopping Frontend Server (Port 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    if not "%%a"=="0" (
        echo Killing process %%a for port 3000
        taskkill /PID %%a /F >nul 2>&1
    )
)

REM Kill processes using port 3001 (Backend)
echo [2/3] Stopping Backend Server (Port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    if not "%%a"=="0" (
        echo Killing process %%a for port 3001
        taskkill /PID %%a /F >nul 2>&1
    )
)

REM Kill Node.js processes (WhatsApp Bot and other Node processes)
echo [3/3] Stopping WhatsApp Bot and other Node.js processes...
tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr /V "INFO:" > temp_node_processes.txt
for /f "tokens=2 delims=," %%a in (temp_node_processes.txt) do (
    echo Killing Node.js process %%a
    taskkill /PID %%a /F >nul 2>&1
)
del temp_node_processes.txt >nul 2>&1

REM Wait a moment for processes to terminate
timeout /t 2 /nobreak > nul

echo.
echo [INFO] Verifying all services are stopped...
echo.

REM Check if ports are still in use
netstat -ano | findstr ":3000\|:3001" >nul
if %errorlevel% equ 0 (
    echo WARNING: Some services may still be running on ports 3000 or 3001
    echo.
    echo Remaining processes:
    netstat -ano | findstr ":3000\|:3001"
    echo.
    echo You may need to manually kill these processes or restart your computer.
) else (
    echo [OK] All services have been stopped successfully!
)

echo.
echo ========================================
echo   ALL SERVICES STOPPED
echo ========================================
echo.
echo To start all services again, run: start-all.bat
echo.
echo Press any key to exit...
pause >nul

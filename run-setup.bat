@echo off
echo =========================================
echo ISP Management System - Quick Setup
echo =========================================
echo.

echo [1] Installing all dependencies...
call npm run install-all
if errorlevel 1 goto error

echo.
echo [2] Setting up database...
cd server
call npx prisma generate
call npx prisma db push
if errorlevel 1 goto error

cd ..
echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo Run "npm run dev" to start development
echo.
pause
exit /b 0

:error
echo.
echo ERROR: Setup failed!
pause
exit /b 1

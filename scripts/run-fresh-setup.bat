@echo off
REM ISP Management System - Fresh Setup Script
REM Script ini akan setup environment development dari awal

echo =========================================
echo ISP Management System - Fresh Setup
echo =========================================
echo.

echo [1] Installing dependencies...
cd ..
call npm install
if errorlevel 1 goto error

echo.
echo [2] Installing server dependencies...
cd server
call npm install
if errorlevel 1 goto error

echo.
echo [3] Installing client dependencies...
cd ../client
call npm install
if errorlevel 1 goto error

echo.
echo [4] Setting up database...
cd ../server
call npx prisma generate
call npx prisma db push
call npx prisma db seed
if errorlevel 1 goto error

cd ..
echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo Run "npm run dev" to start development server
echo Default login: superadmin / super123
echo.
pause
exit /b 0

:error
echo.
echo ERROR: Setup failed!
echo Please check the error messages above.
pause
exit /b 1

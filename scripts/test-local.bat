@echo off
echo ========================================
echo   Testing Local Development Setup
echo ========================================
echo.

:: Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not installed!
    pause
    exit /b 1
)
echo OK - Node.js installed

:: Check npm
echo [2/4] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not installed!
    pause
    exit /b 1
)
echo OK - npm installed

:: Check Backend Dependencies
echo [3/4] Checking Backend dependencies...
cd server
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)
if not exist prisma\dev.db (
    echo Setting up database...
    npx prisma generate
    npx prisma db push
    node prisma/seed.js
)
echo OK - Backend ready

:: Check Frontend Dependencies
echo [4/4] Checking Frontend dependencies...
cd ../client
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)
echo OK - Frontend ready

cd ..
echo.
echo ========================================
echo   All checks passed! Ready to develop
echo ========================================
echo.
echo Run 'dev.bat' to start development servers
echo.
pause

@echo off
echo =======================================
echo   Starting ISP Management Development
echo =======================================
echo.

:: Start Backend
echo [1/2] Starting Backend Server...
cd server
start cmd /k "title Backend Server - Port 3001 && npm run dev"
timeout /t 3 >nul

:: Start Frontend
echo [2/2] Starting Frontend Server...
cd ../client
start cmd /k "title Frontend Server - Port 3000 && npm run dev"

echo.
echo =======================================
echo   Development Servers Started!
echo =======================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:3000

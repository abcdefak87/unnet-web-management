@echo off
echo Starting ISP Management Development Servers...
echo.

:: Open two new terminals
start cmd /k "cd server && echo Starting Backend... && npm run dev"
start cmd /k "cd client && echo Starting Frontend... && npm run dev"

echo Development servers starting in separate windows...
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
timeout /t 5
start http://localhost:3000

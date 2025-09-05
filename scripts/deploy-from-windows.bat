@echo off
REM ISP Management System - Windows Deployment Script
REM This script helps deploy from Windows to the production server

echo =========================================
echo ISP Management System - Windows Deployment
echo =========================================
echo.

REM Configuration - Update these values as needed
set SERVER_IP=172.17.2.3
set SERVER_USER=root
set PROJECT_DIR=/var/www/isp-management

echo [1] Committing and pushing local changes to GitHub...
git add .
git commit -m "Auto-commit: Deployment update %date% %time%"
git push origin main

echo.
echo [2] Connecting to server and running deployment...
echo.
echo You will need to enter the server password when prompted.
echo.

REM Create deployment command
echo Running deployment on server...
ssh %SERVER_USER%@%SERVER_IP% "cd %PROJECT_DIR% && sudo bash scripts/deploy-server.sh"

echo.
echo =========================================
echo Deployment process completed!
echo =========================================
echo.
echo Check the output above for any errors.
echo Access the application at: http://%SERVER_IP%
echo.
pause

@echo off
REM ISP Management System - Clean & Setup Script Runner
REM Script ini akan membersihkan konfigurasi lama dan setup ulang dari awal

echo =========================================
echo ISP Management System - Clean ^& Setup
echo =========================================
echo.

REM Configuration
set SERVER_IP=172.17.2.3
set SERVER_USER=root
set SCRIPT_PATH=/tmp/clean-and-setup.sh

echo [1] Upload script ke server...
scp scripts\clean-and-setup.sh %SERVER_USER%@%SERVER_IP%:%SCRIPT_PATH%

echo.
echo [2] Menjalankan clean and setup di server...
echo.
echo PERHATIAN: Ini akan:
echo   - MENGHAPUS semua konfigurasi lama
echo   - Backup data penting ke /var/backups/isp-management
echo   - Install ulang aplikasi dari GitHub
echo   - Generate JWT secrets baru
echo   - Setup PM2 dan Nginx
echo.
pause

echo.
echo Connecting to server and running setup...
ssh %SERVER_USER%@%SERVER_IP% "chmod +x %SCRIPT_PATH% && sudo bash %SCRIPT_PATH%"

echo.
echo =========================================
echo Clean ^& Setup Complete!
echo =========================================
echo.
echo Akses aplikasi di: http://%SERVER_IP%
echo Default login: superadmin / super123
echo.
pause

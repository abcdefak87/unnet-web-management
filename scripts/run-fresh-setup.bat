@echo off
REM ISP Management System - Run Fresh Setup on Linux Server
REM Script ini akan menjalankan fresh setup di server Linux

echo =========================================
echo ISP Management System - Fresh Setup Linux
echo =========================================
echo.

REM Configuration
set SERVER_IP=172.17.2.3
set SERVER_USER=root
set SCRIPT_PATH=/tmp/fresh-setup-linux.sh

echo [1] Upload script ke server...
scp scripts\fresh-setup-linux.sh %SERVER_USER%@%SERVER_IP%:%SCRIPT_PATH%

echo.
echo [2] Menjalankan fresh setup di server...
echo.
echo PERHATIAN: Ini akan MENGHAPUS instalasi lama dan setup ulang dari awal!
echo.
pause

echo.
echo Connecting to server and running setup...
ssh %SERVER_USER%@%SERVER_IP% "chmod +x %SCRIPT_PATH% && sudo bash %SCRIPT_PATH%"

echo.
echo =========================================
echo Setup selesai!
echo =========================================
echo.
echo Akses aplikasi di: http://%SERVER_IP%
echo.
pause

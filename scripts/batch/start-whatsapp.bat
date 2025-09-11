@echo off
title WhatsApp Bot
color 0B

echo Starting WhatsApp Bot...
cd /d "%~dp0.."
node scripts/whatsapp-bot-integrated.js
pause

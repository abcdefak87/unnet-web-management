#!/bin/bash

# ISP Management System - Linux Setup Runner
# Script untuk menjalankan clean-and-setup.sh langsung di server Linux

echo "╔════════════════════════════════════════╗"
echo "║   ISP Management System Setup Runner    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[✗]${NC} Script ini harus dijalankan sebagai root atau dengan sudo"
   echo "Usage: sudo bash run-setup-linux.sh"
   exit 1
fi

# Configuration
GITHUB_RAW="https://raw.githubusercontent.com/abcdefak87/unnet-web-management/main"
SCRIPT_NAME="clean-and-setup.sh"
TEMP_DIR="/tmp"
LOCAL_SCRIPT="$TEMP_DIR/$SCRIPT_NAME"

echo -e "${BLUE}[1]${NC} Downloading setup script dari GitHub..."
wget -q -O "$LOCAL_SCRIPT" "$GITHUB_RAW/scripts/$SCRIPT_NAME"

if [ ! -f "$LOCAL_SCRIPT" ]; then
    echo -e "${RED}[✗]${NC} Gagal download script dari GitHub"
    echo ""
    echo "Alternative: Copy script manual"
    echo "1. Clone repository:"
    echo "   git clone https://github.com/abcdefak87/unnet-web-management.git"
    echo "2. Run script:"
    echo "   cd unnet-web-management/scripts"
    echo "   sudo bash clean-and-setup.sh"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Script berhasil di-download"

chmod +x "$LOCAL_SCRIPT"

echo ""
echo -e "${YELLOW}════════════════════════════════════════════${NC}"
echo -e "${YELLOW}           PERHATIAN PENTING!${NC}"
echo -e "${YELLOW}════════════════════════════════════════════${NC}"
echo ""
echo "Script ini akan:"
echo "  • Menghentikan semua services yang berjalan"
echo "  • Backup data penting ke /var/backups/isp-management"
echo "  • MENGHAPUS instalasi lama di /var/www/isp-management"
echo "  • Clone repository baru dari GitHub"
echo "  • Generate JWT secrets baru secara otomatis"
echo "  • Setup database SQLite dengan seed data"
echo "  • Build frontend untuk production"
echo "  • Konfigurasi PM2 dan Nginx"
echo ""
echo -e "${YELLOW}Lanjutkan? (y/n):${NC} "
read -r confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Setup dibatalkan."
    exit 0
fi

echo ""
echo -e "${BLUE}[2]${NC} Menjalankan setup script..."
echo ""

# Run the setup script
bash "$LOCAL_SCRIPT"

# Cleanup
rm -f "$LOCAL_SCRIPT"

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}         Setup Runner Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"

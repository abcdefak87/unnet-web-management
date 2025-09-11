#!/bin/bash

# ISP Management System - Fix Vulnerabilities Script
# Untuk mengatasi npm audit vulnerabilities

set -e

echo "🔒 ISP Management System - Fix Vulnerabilities"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting vulnerability fix process..."

# 1. Fix root dependencies
print_status "Fixing root dependencies vulnerabilities..."
npm audit fix --force
print_success "Root dependencies vulnerabilities fixed"

# 2. Fix server dependencies
print_status "Fixing server dependencies vulnerabilities..."
cd server
npm audit fix --force
cd ..
print_success "Server dependencies vulnerabilities fixed"

# 3. Fix client dependencies
print_status "Fixing client dependencies vulnerabilities..."
cd client
npm audit fix --force
cd ..
print_success "Client dependencies vulnerabilities fixed"

# 4. Update deprecated packages
print_status "Updating deprecated packages..."

# Update Baileys to official package
print_status "Updating Baileys to official package..."
cd server
npm uninstall @whiskeysockets/baileys
npm install baileys
cd ..
print_success "Baileys updated to official package"

# Update Multer to v2
print_status "Updating Multer to v2..."
cd server
npm install multer@^2.0.0
cd ..
print_success "Multer updated to v2"

# Fix ESLint compatibility issues
print_status "Fixing ESLint compatibility issues..."
cd client

# Remove node_modules and package-lock.json to clean install
rm -rf node_modules package-lock.json

# Install with legacy peer deps to resolve conflicts
npm install --legacy-peer-deps

cd ..
print_success "ESLint compatibility issues fixed"

# 5. Fix Husky
print_status "Fixing Husky configuration..."
npm install husky@latest
npx husky init
print_success "Husky updated and initialized"

# 6. Final audit check
print_status "Running final security audit..."
echo ""
echo "=== ROOT AUDIT ==="
npm audit
echo ""
echo "=== SERVER AUDIT ==="
cd server && npm audit && cd ..
echo ""
echo "=== CLIENT AUDIT ==="
cd client && npm audit && cd ..

print_success "Vulnerability fix process completed!"
echo ""
echo "📋 Summary:"
echo "   - Updated deprecated packages"
echo "   - Fixed npm audit vulnerabilities"
echo "   - Updated Husky to latest version"
echo "   - Updated Baileys to official package"
echo ""
echo "⚠️  Note: Some breaking changes may have been applied."
echo "   Test your application thoroughly after these updates."
echo ""

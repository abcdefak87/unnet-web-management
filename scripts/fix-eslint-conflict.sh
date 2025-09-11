#!/bin/bash

# ISP Management System - Fix ESLint Conflict Script
# Untuk mengatasi ERESOLVE dependency conflict

set -e

echo "🔧 ISP Management System - Fix ESLint Conflict"
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
if [ ! -f "package.json" ] || [ ! -d "client" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting ESLint conflict fix process..."

# 1. Clean client dependencies
print_status "Cleaning client dependencies..."
cd client
rm -rf node_modules package-lock.json
print_success "Client dependencies cleaned"

# 2. Install with legacy peer deps
print_status "Installing client dependencies with legacy peer deps..."
npm install --legacy-peer-deps
print_success "Client dependencies installed with legacy peer deps"

# 3. Verify installation
print_status "Verifying installation..."
npm list eslint eslint-config-next
print_success "Installation verified"

# 4. Test build
print_status "Testing build..."
npm run build
print_success "Build test successful"

cd ..

print_success "ESLint conflict fix completed!"
echo ""
echo "📋 Summary:"
echo "   - Cleaned client node_modules and package-lock.json"
echo "   - Installed dependencies with --legacy-peer-deps"
echo "   - Verified ESLint and Next.js compatibility"
echo "   - Tested build process"
echo ""
echo "✅ ESLint conflict resolved!"
echo ""

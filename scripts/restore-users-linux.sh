#!/bin/bash

# ISP Management System - Restore Users Script for Linux
# Untuk mengembalikan akun user yang hilang setelah deployment

set -e

echo "👥 ISP Management System - Restore Users (Linux)"
echo "================================================"
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
if [ ! -f "package.json" ] || [ ! -d "server" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting user restoration process..."

# 1. Check if server/.env exists
if [ ! -f "server/.env" ]; then
    print_warning "No server/.env found, creating from template..."
    cat > server/.env << 'EOF'
# ISP Management System - Server Environment Variables
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL="file:./prisma/prod.db"

# JWT Secrets
JWT_SECRET=7657c1ef0831a49fefed171b28a4de1b2adb1e204e574b8264f378e6a3713febb4332f6e5b53e8ed8309880e7548c6409d88a522e05037e53d8e5bc0a49f3c33
JWT_REFRESH_SECRET=24f853bad17bc5cf104b983c080a2795733708fd52059bf7dad9dfdf31b80ad94be07355d51a7c2b5a57bf12cb3cdda338c684d9e7aa96d7604adbe761bb01b6

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./auth_info_baileys
WHATSAPP_QR_PATH=./public/qr

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=1a5c0f271af7fb8291a185f4fb24b12656aa40445097291c25c8865d8d984452

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/combined.log
EOF
    print_success "Environment file created"
fi

# 2. Generate Prisma client
print_status "Generating Prisma client..."
cd server
npx prisma generate
print_success "Prisma client generated"

# 3. Run database migrations
print_status "Running database migrations..."
npx prisma db push
print_success "Database migrations completed"

# 4. Seed database with default users
print_status "Seeding database with default users..."
npx prisma db seed
print_success "Database seeded successfully"

# 5. Restore users (if needed)
print_status "Running user restoration script..."
node restore-users.js
print_success "User restoration completed"

# 6. Verify users
print_status "Verifying users in database..."
echo ""
echo "📊 Current users in database:"
npx prisma studio --port 5556 &
STUDIO_PID=$!
sleep 3
kill $STUDIO_PID 2>/dev/null || true

# Alternative verification using direct query
echo ""
echo "🔍 User verification:"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isVerified: true
      }
    });
    
    console.log(\`📊 Total users: \${users.length}\`);
    users.forEach(user => {
      console.log(\`   - \${user.username} (\${user.role}) - \${user.isActive ? 'Active' : 'Inactive'}\`);
    });
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyUsers();
"

cd ..

print_success "User restoration process completed!"
echo ""
echo "🔑 Login Credentials:"
echo "   superadmin/super123 (Super Admin - Full Access)"
echo "   admin/admin123 (Admin - Limited Access)"
echo "   gudang/gudang123 (Inventory Admin - Inventory + Reports)"
echo "   userbiasa/user123 (Regular User - View Only)"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/api/health"
echo ""
echo "📊 PM2 Commands:"
echo "   pm2 status          - Check service status"
echo "   pm2 logs            - View logs"
echo "   pm2 restart all     - Restart all services"
echo ""

#!/bin/bash

# ISP Management System - Application Configuration Script
# Run this after install-server.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/isp-management"
ENV_FILE="$PROJECT_DIR/server/.env"

echo -e "${BLUE}🔧 ISP Management System - Application Configuration${NC}"
echo -e "${BLUE}====================================================${NC}"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    print_status "Please clone your repository first:"
    print_status "git clone YOUR_GITHUB_REPO_URL $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

# Install dependencies
print_status "Installing project dependencies..."
npm run install-all

# Create production environment file
print_status "Creating production environment file..."
if [ ! -f "$ENV_FILE" ]; then
    cp server/.env.example $ENV_FILE
    print_status "Environment file created from template"
else
    print_warning "Environment file already exists, backing up..."
    cp $ENV_FILE $ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)
fi

# Generate JWT secrets
print_status "Generating JWT secrets..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Update environment file with production settings
print_status "Updating environment configuration..."
cat > $ENV_FILE << EOF
# Database Configuration (PostgreSQL for production)
DATABASE_URL="postgresql://isp_user:your_secure_password_here@localhost:5432/isp_management"

# JWT Configuration (Auto-generated secure secrets)
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (Update with your domain)
FRONTEND_URL="https://yourdomain.com"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg,application/pdf"

# Rate Limiting (Production settings)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=true

# Telegram Bot Configuration (Optional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_WEBHOOK_URL=""

# Logging Configuration
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
EOF

print_status "Environment file configured with secure defaults"

# Setup database
print_status "Setting up database schema..."
cd server
npx prisma generate
npx prisma db push

# Seed database with initial data
print_status "Seeding database with initial data..."
npm run db:seed || print_warning "Database seeding failed or no seed file found"

# Build client application
print_status "Building client application..."
cd ../client
npm run build

# Create PM2 ecosystem file
print_status "Creating PM2 ecosystem configuration..."
cd ..
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'isp-management-server',
      script: 'server/index.js',
      cwd: '$PROJECT_DIR',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_memory_restart: '500M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'isp-management-client',
      script: 'npm',
      args: 'start',
      cwd: '$PROJECT_DIR/client',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://yourdomain.com/api'
      },
      error_file: './logs/pm2-client-error.log',
      out_file: './logs/pm2-client-out.log',
      log_file: './logs/pm2-client-combined.log',
      time: true,
      max_memory_restart: '300M'
    }
  ]
};
EOF

# Set proper permissions
print_status "Setting file permissions..."
sudo chown -R $USER:www-data $PROJECT_DIR
sudo chmod -R 755 $PROJECT_DIR
sudo chmod -R 775 $PROJECT_DIR/server/logs
sudo chmod -R 775 $PROJECT_DIR/server/uploads
sudo chmod -R 775 $PROJECT_DIR/client/.next

# Start applications with PM2
print_status "Starting applications with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Create update script
print_status "Creating update script..."
cat > update-app.sh << 'EOF'
#!/bin/bash

# ISP Management System - Update Script
# Run this script to update the application from GitHub

set -e

PROJECT_DIR="/var/www/isp-management"
cd $PROJECT_DIR

echo "🔄 Updating ISP Management System..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm run install-all

# Build client
cd client && npm run build && cd ..

# Update database schema if needed
cd server && npx prisma generate && npx prisma db push && cd ..

# Restart applications
pm2 restart all

echo "✅ Update completed successfully!"
EOF

chmod +x update-app.sh

# Display configuration summary
echo -e "\n${GREEN}✅ Application Configuration Complete!${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}Configuration Summary:${NC}"
echo -e "• Environment file: $ENV_FILE"
echo -e "• JWT secrets: Generated automatically"
echo -e "• Database: Configured and migrated"
echo -e "• PM2: Configured and started"
echo -e "• Update script: ./update-app.sh"

echo -e "\n${GREEN}PM2 Status:${NC}"
pm2 status

echo -e "\n${GREEN}Next Steps:${NC}"
echo -e "1. Update database password in .env file"
echo -e "2. Update domain settings in .env file"
echo -e "3. Configure Nginx: ${YELLOW}./setup/configure-nginx.sh${NC}"
echo -e "4. Setup SSL certificates"
echo -e "5. Test application: ${YELLOW}curl http://localhost:3001/health${NC}"

echo -e "\n${YELLOW}⚠️  Important:${NC}"
echo -e "• Create database and user"
sudo -u postgres createdb isp_management 2>/dev/null || echo "Database already exists"
sudo -u postgres createuser -P isp_user 2>/dev/null || echo "User already exists"
echo -e "• Update FRONTEND_URL and ALLOWED_ORIGINS in .env"
echo -e "• Configure Telegram bot token if needed"

print_status "Application configuration completed successfully!"

#!/bin/bash

# ISP Management System - Server Installation Script
# For Ubuntu/Debian Linux servers
# Compatible with MobaXterm SSH connections

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="isp-management"
DOMAIN="yourdomain.com"
DB_NAME="isp_management"
DB_USER="isp_user"
GITHUB_REPO="https://github.com/username/isp-management-system.git"

echo -e "${BLUE}🚀 ISP Management System - Server Installation${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   print_status "Please run as a regular user with sudo privileges"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 22.x
print_status "Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "NPM version: $NPM_VERSION"

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Install PostgreSQL
print_status "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install Certbot for SSL
print_status "Installing Certbot for SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /var/www/$PROJECT_NAME
sudo chown -R $USER:$USER /var/www/$PROJECT_NAME

# Clone repository (user will need to update this)
print_status "Repository setup..."
print_warning "Please update GITHUB_REPO variable in this script with your actual repository URL"
print_status "Example: git clone $GITHUB_REPO /var/www/$PROJECT_NAME"

# Create PostgreSQL database and user
print_status "Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

# Create logs directory
print_status "Creating logs directory..."
mkdir -p /var/www/$PROJECT_NAME/server/logs
mkdir -p /var/www/$PROJECT_NAME/server/uploads

# Set proper permissions
print_status "Setting file permissions..."
sudo chown -R $USER:www-data /var/www/$PROJECT_NAME
sudo chmod -R 755 /var/www/$PROJECT_NAME
sudo chmod -R 775 /var/www/$PROJECT_NAME/server/logs
sudo chmod -R 775 /var/www/$PROJECT_NAME/server/uploads

# Create systemd service (alternative to PM2)
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/$PROJECT_NAME.service > /dev/null << EOF
[Unit]
Description=ISP Management System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/$PROJECT_NAME/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$PROJECT_NAME

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable $PROJECT_NAME

# Configure firewall
print_status "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # Next.js development
sudo ufw allow 3001  # API server

# Display installation summary
echo -e "\n${GREEN}✅ Server Installation Complete!${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}Next Steps:${NC}"
echo -e "1. Update GITHUB_REPO variable in this script"
echo -e "2. Clone your repository: ${YELLOW}git clone YOUR_REPO_URL /var/www/$PROJECT_NAME${NC}"
echo -e "3. Run: ${YELLOW}cd /var/www/$PROJECT_NAME && ./setup/configure-app.sh${NC}"
echo -e "4. Configure domain and SSL: ${YELLOW}./setup/configure-nginx.sh${NC}"
echo -e "\n${GREEN}Installed Services:${NC}"
echo -e "• Node.js: $NODE_VERSION"
echo -e "• NPM: $NPM_VERSION"
echo -e "• PM2: $(pm2 --version)"
echo -e "• PostgreSQL: $(sudo -u postgres psql -c 'SELECT version();' | head -3 | tail -1)"
echo -e "• Nginx: $(nginx -v 2>&1)"
echo -e "\n${GREEN}Database Created:${NC}"
echo -e "• Database: $DB_NAME"
echo -e "• User: $DB_USER"
echo -e "• Password: your_secure_password_here (CHANGE THIS!)"
echo -e "\n${YELLOW}⚠️  Important Security Notes:${NC}"
echo -e "• Change default database password"
echo -e "• Update JWT secrets in .env file"
echo -e "• Configure proper domain in Nginx"
echo -e "• Setup SSL certificates with Certbot"

print_status "Installation script completed successfully!"

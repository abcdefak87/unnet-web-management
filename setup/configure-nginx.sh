#!/bin/bash

# ISP Management System - Nginx Configuration Script
# Configure reverse proxy and SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌐 ISP Management System - Nginx Configuration${NC}"
echo -e "${BLUE}===============================================${NC}"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get domain from user
read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    print_error "Domain and email are required!"
    exit 1
fi

print_status "Configuring Nginx for domain: $DOMAIN"

# Create Nginx configuration
print_status "Creating Nginx site configuration..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
# ISP Management System - Nginx Configuration
# Domain: $DOMAIN

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

# Upstream servers
upstream backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream frontend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss: https:;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # API Backend (Node.js)
    location /api/ {
        # Rate limiting for API
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket for real-time features
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Auth endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # File uploads
    location /uploads/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health checks
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
EOF

# Enable the site
print_status "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
    print_status "Removed default Nginx site"
fi

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    print_error "Nginx configuration test failed!"
    exit 1
fi

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx

# Obtain SSL certificate
print_status "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email --redirect

# Setup automatic certificate renewal
print_status "Setting up automatic SSL certificate renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Create SSL renewal test script
cat > /home/$USER/test-ssl-renewal.sh << 'EOF'
#!/bin/bash
echo "Testing SSL certificate renewal..."
sudo certbot renew --dry-run
EOF
chmod +x /home/$USER/test-ssl-renewal.sh

# Update environment file with correct domain
print_status "Updating application environment with domain..."
ENV_FILE="/var/www/isp-management/server/.env"
if [ -f "$ENV_FILE" ]; then
    sed -i "s/yourdomain.com/$DOMAIN/g" $ENV_FILE
    print_status "Updated domain in environment file"
fi

# Restart PM2 applications to pick up new environment
print_status "Restarting applications..."
cd /var/www/isp-management
pm2 restart all

# Display configuration summary
echo -e "\n${GREEN}✅ Nginx Configuration Complete!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Configuration Summary:${NC}"
echo -e "• Domain: $DOMAIN"
echo -e "• SSL Certificate: Installed and configured"
echo -e "• Auto-renewal: Enabled"
echo -e "• Security headers: Configured"
echo -e "• Rate limiting: Enabled"
echo -e "• Gzip compression: Enabled"

echo -e "\n${GREEN}SSL Certificate Status:${NC}"
sudo certbot certificates

echo -e "\n${GREEN}Test Your Setup:${NC}"
echo -e "• Frontend: https://$DOMAIN"
echo -e "• API Health: https://$DOMAIN/api/health"
echo -e "• Backend Health: https://$DOMAIN/health"

echo -e "\n${GREEN}Useful Commands:${NC}"
echo -e "• Test SSL renewal: ./test-ssl-renewal.sh"
echo -e "• Check Nginx status: sudo systemctl status nginx"
echo -e "• View Nginx logs: sudo tail -f /var/log/nginx/access.log"
echo -e "• Reload Nginx: sudo systemctl reload nginx"

echo -e "\n${YELLOW}⚠️  Security Notes:${NC}"
echo -e "• SSL certificate will auto-renew every 60 days"
echo -e "• Rate limiting is configured for API and auth endpoints"
echo -e "• Security headers are configured for protection"
echo -e "• Monitor logs regularly for security issues"

print_status "Nginx configuration completed successfully!"

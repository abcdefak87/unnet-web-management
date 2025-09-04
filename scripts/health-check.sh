#!/bin/bash

# ISP Management System - Comprehensive Health Check
# Verifies all components are working correctly

echo "🔍 ISP Management System Health Check"
echo "====================================="
echo "Timestamp: $(date)"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check system services
echo "📊 System Services Status:"
echo "-------------------------"

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    print_status 0 "PostgreSQL service is running"
else
    print_status 1 "PostgreSQL service is not running"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    print_status 0 "Nginx service is running"
else
    print_status 1 "Nginx service is not running"
fi

echo ""

# Check PM2 applications
echo "📱 PM2 Applications:"
echo "-------------------"

if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null)
    if [ $? -eq 0 ]; then
        BACKEND_STATUS=$(echo $PM2_STATUS | jq -r '.[] | select(.name=="isp-backend") | .pm2_env.status' 2>/dev/null)
        FRONTEND_STATUS=$(echo $PM2_STATUS | jq -r '.[] | select(.name=="isp-frontend") | .pm2_env.status' 2>/dev/null)
        
        if [ "$BACKEND_STATUS" = "online" ]; then
            print_status 0 "Backend application is running"
        else
            print_status 1 "Backend application is not running (Status: $BACKEND_STATUS)"
        fi
        
        if [ "$FRONTEND_STATUS" = "online" ]; then
            print_status 0 "Frontend application is running"
        else
            print_status 1 "Frontend application is not running (Status: $FRONTEND_STATUS)"
        fi
    else
        print_status 1 "Cannot get PM2 status"
    fi
else
    print_status 1 "PM2 is not installed"
fi

echo ""

# Check database connection
echo "🗄️ Database Connection:"
echo "----------------------"

cd /var/www/isp-management/server 2>/dev/null || cd server 2>/dev/null || {
    print_status 1 "Cannot find server directory"
    echo ""
}

if [ -f "package.json" ]; then
    DB_TEST=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect()
            .then(() => prisma.user.count())
            .then(count => {
                console.log('SUCCESS:' + count);
                process.exit(0);
            })
            .catch(err => {
                console.log('ERROR:' + err.message);
                process.exit(1);
            })
            .finally(() => prisma.\$disconnect());
    " 2>/dev/null)
    
    if [[ $DB_TEST == SUCCESS:* ]]; then
        USER_COUNT=${DB_TEST#SUCCESS:}
        print_status 0 "Database connection successful (Users: $USER_COUNT)"
    else
        ERROR_MSG=${DB_TEST#ERROR:}
        print_status 1 "Database connection failed: $ERROR_MSG"
    fi
else
    print_status 1 "Cannot find package.json in server directory"
fi

echo ""

# Check protected accounts
echo "🔐 Protected Accounts:"
echo "---------------------"

if [ -f "../scripts/preserve-accounts.js" ]; then
    ACCOUNT_CHECK=$(node ../scripts/preserve-accounts.js verify 2>/dev/null)
    if [ $? -eq 0 ]; then
        print_status 0 "All protected accounts verified"
    else
        print_status 1 "Protected accounts verification failed"
    fi
else
    print_warning "Account verification script not found"
fi

echo ""

# Check web server response
echo "🌐 Web Server Response:"
echo "----------------------"

# Check if we can determine the domain
if [ -f "/etc/nginx/sites-available/isp-management" ]; then
    DOMAIN=$(grep -o "server_name [^;]*" /etc/nginx/sites-available/isp-management | head -1 | awk '{print $2}')
    
    if [ ! -z "$DOMAIN" ] && [ "$DOMAIN" != "_" ]; then
        # Test HTTPS
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN --max-time 10 2>/dev/null)
        if [ "$HTTP_STATUS" = "200" ]; then
            print_status 0 "HTTPS response OK (https://$DOMAIN)"
        else
            print_status 1 "HTTPS response failed (Status: $HTTP_STATUS)"
        fi
        
        # Test API health endpoint
        API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/health --max-time 10 2>/dev/null)
        if [ "$API_STATUS" = "200" ]; then
            print_status 0 "API health endpoint OK"
        else
            print_status 1 "API health endpoint failed (Status: $API_STATUS)"
        fi
    else
        print_warning "Domain not configured in Nginx"
    fi
else
    print_warning "Nginx configuration file not found"
fi

# Test localhost endpoints
LOCAL_BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health --max-time 5 2>/dev/null)
if [ "$LOCAL_BACKEND" = "200" ]; then
    print_status 0 "Local backend responding (port 3001)"
else
    print_status 1 "Local backend not responding (Status: $LOCAL_BACKEND)"
fi

LOCAL_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5 2>/dev/null)
if [ "$LOCAL_FRONTEND" = "200" ]; then
    print_status 0 "Local frontend responding (port 3000)"
else
    print_status 1 "Local frontend not responding (Status: $LOCAL_FRONTEND)"
fi

echo ""

# Check SSL certificate
echo "🔒 SSL Certificate:"
echo "------------------"

if command -v certbot &> /dev/null; then
    CERT_INFO=$(certbot certificates 2>/dev/null | grep -A 5 "Certificate Name")
    if [ ! -z "$CERT_INFO" ]; then
        EXPIRY=$(echo "$CERT_INFO" | grep "Expiry Date" | head -1)
        if [ ! -z "$EXPIRY" ]; then
            print_status 0 "SSL certificate found"
            echo "    $EXPIRY"
        else
            print_status 1 "SSL certificate information incomplete"
        fi
    else
        print_status 1 "No SSL certificates found"
    fi
else
    print_warning "Certbot not installed"
fi

echo ""

# Check system resources
echo "💾 System Resources:"
echo "-------------------"

# Disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    print_status 0 "Disk usage OK ($DISK_USAGE%)"
else
    print_status 1 "Disk usage high ($DISK_USAGE%)"
fi

# Memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -lt 80 ]; then
    print_status 0 "Memory usage OK ($MEM_USAGE%)"
else
    print_status 1 "Memory usage high ($MEM_USAGE%)"
fi

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
print_status 0 "Load average: $LOAD_AVG"

echo ""

# Check log files for recent errors
echo "📋 Recent Errors:"
echo "----------------"

ERROR_COUNT=0

# Check PM2 logs for errors in last 10 minutes
if command -v pm2 &> /dev/null; then
    PM2_ERRORS=$(pm2 logs --lines 100 --nostream 2>/dev/null | grep -i error | tail -5)
    if [ ! -z "$PM2_ERRORS" ]; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "PM2 Recent Errors:"
        echo "$PM2_ERRORS"
    fi
fi

# Check Nginx error logs
if [ -f "/var/log/nginx/error.log" ]; then
    NGINX_ERRORS=$(tail -20 /var/log/nginx/error.log 2>/dev/null | grep "$(date '+%Y/%m/%d')" | tail -3)
    if [ ! -z "$NGINX_ERRORS" ]; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "Nginx Recent Errors:"
        echo "$NGINX_ERRORS"
    fi
fi

if [ $ERROR_COUNT -eq 0 ]; then
    print_status 0 "No recent errors found"
fi

echo ""

# Summary
echo "📊 Health Check Summary:"
echo "========================"

# Count successful checks (this is a simplified version)
# In a real implementation, you'd track each check result

echo "Health check completed at $(date)"
echo ""
echo "🔧 Quick Commands:"
echo "  pm2 status                    # Check PM2 applications"
echo "  sudo systemctl status nginx   # Check Nginx status"
echo "  pm2 logs                      # View application logs"
echo "  pm2 restart all               # Restart applications"
echo ""
echo "📞 For issues, check:"
echo "  - /var/log/nginx/error.log    # Nginx errors"
echo "  - pm2 logs                    # Application logs"
echo "  - sudo journalctl -u postgresql # Database logs"

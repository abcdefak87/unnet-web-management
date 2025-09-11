/**
 * WhatsApp Client for OTP and messaging services
 * Interfaces with the main WhatsApp bot (whatsapp-bot-final.js)
 */

const fs = require('fs');
const path = require('path');

class WhatsAppClient {
  constructor() {
    this.isConnected = false;
    this.messageQueue = [];
    
    // Check if WhatsApp bot is running
    this.checkConnection();
    setInterval(() => this.checkConnection(), 30000); // Check every 30 seconds
  }
  
  checkConnection() {
    // Check if the bot is running by looking for the session folder
    const sessionPath = path.join(__dirname, '../../auth_info_baileys');
    this.isConnected = fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;
  }
  
  async sendMessage(to, message) {
    try {
      // Write message to test-message.json for the bot to pick up
      const messageData = {
        to,
        message,
        timestamp: new Date().toISOString(),
        type: 'outgoing'
      };
      
      const testMessagePath = path.join(__dirname, '../../../scripts/test-message.json');
      
      // Read existing messages
      let messages = [];
      if (fs.existsSync(testMessagePath)) {
        try {
          const content = fs.readFileSync(testMessagePath, 'utf8');
          messages = JSON.parse(content);
          if (!Array.isArray(messages)) {
            messages = [];
          }
        } catch (error) {
          messages = [];
        }
      }
      
      // Add new message
      messages.push(messageData);
      
      // Keep only last 100 messages to prevent file from growing too large
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      
      // Write back to file
      fs.writeFileSync(testMessagePath, JSON.stringify(messages, null, 2));
      
      console.log(`Pesan antrian untuk pengiriman WhatsApp ke ${to}`);
      return true;
    } catch (error) {
      console.error('Error mengirim pesan WhatsApp:', error);
      return false;
    }
  }
  
  isReady() {
    return this.isConnected;
  }
  
  getStatus() {
    return {
      connected: this.isConnected,
      queueSize: this.messageQueue.length
    };
  }
}

// Singleton instance
let instance = null;

function getWhatsAppClient() {
  if (!instance) {
    instance = new WhatsAppClient();
  }
  return instance;
}

module.exports = {
  getWhatsAppClient,
  WhatsAppClient
};

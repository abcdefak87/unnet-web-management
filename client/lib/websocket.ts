// @ts-ignore - socket.io-client types will be installed
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect(userId: string, role: string): Socket | null {
    if (this.isConnecting) {
      console.log('WebSocket connection already in progress, skipping...');
      return this.socket;
    }

    if (this.socket?.connected) {
      console.log('WebSocket already connected, skipping...');
      return this.socket;
    }

    this.isConnecting = true;

    try {
      this.socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 10000,
        autoConnect: true
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Join user rooms
        this.socket?.emit('join-room', { userId, role });
        
        // Start heartbeat
        this.startHeartbeat();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.socket?.connect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnecting = false;
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          this.isConnecting = false;
        }
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      });

      return this.socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      return null;
    }
  }

  private startHeartbeat() {
    // Send heartbeat every 25 seconds to prevent timeout
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
        console.log('WebSocket heartbeat sent');
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Event listeners
  onJobUpdate(callback: (data: any) => void) {
    this.socket?.on('job-update', callback);
  }

  onUserUpdate(callback: (data: any) => void) {
    this.socket?.on('user-update', callback);
  }

  onInventoryUpdate(callback: (data: any) => void) {
    this.socket?.on('inventory-update', callback);
  }

  onSystemNotification(callback: (data: any) => void) {
    this.socket?.on('system-notification', callback);
  }

  onUserNotification(callback: (data: any) => void) {
    this.socket?.on('user-notification', callback);
  }

  // Remove event listeners
  offJobUpdate(callback: (data: any) => void) {
    this.socket?.off('job-update', callback);
  }

  offUserUpdate(callback: (data: any) => void) {
    this.socket?.off('user-update', callback);
  }

  offInventoryUpdate(callback: (data: any) => void) {
    this.socket?.off('inventory-update', callback);
  }

  offSystemNotification(callback: (data: any) => void) {
    this.socket?.off('system-notification', callback);
  }

  offUserNotification(callback: (data: any) => void) {
    this.socket?.off('user-notification', callback);
  }
}

export default new WebSocketService();

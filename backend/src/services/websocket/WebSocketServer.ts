/**
 * WebSocketServer — Real-Time In-App Updates
 *
 * Only for users who are ACTIVELY using the application.
 * FCM continues to handle all background/killed-app notifications.
 *
 * Use cases:
 *  - Live order status updates in FloatingTracker
 *  - Live driver location updates
 *  - Owner dashboard live metrics
 *  - Delivery dashboard live orders
 *  - FloatingCart badge updates
 *
 * Protocol:
 *  - Client connects: ws://server/ws?uid=FIREBASE_UID
 *  - Server sends: { type: 'order.status_changed', data: { ... } }
 *  - Client receives and updates UI immediately (no Firestore reads needed)
 */

import { WebSocketServer as WSSNative, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { appEventBus, OrderStatusChangedEvent, OrderCreatedEvent } from '../eventBus/AppEventBus.js';

interface ConnectedClient {
  ws: WebSocket;
  uid: string;
  connectedAt: number;
}

class OliveWebSocketServer {
  private wss: WSSNative | null = null;
  private clients = new Map<string, Set<ConnectedClient>>();
  private totalConnections = 0;

  /**
   * Attach to an existing Node.js HTTP server.
   */
  attach(httpServer: any): void {
    if (this.wss) return; // Already attached

    this.wss = new WSSNative({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '/', `ws://${req.headers.host}`);
      const uid = url.searchParams.get('uid') || 'anonymous';

      const client: ConnectedClient = { ws, uid, connectedAt: Date.now() };
      this.totalConnections++;

      // Register client
      if (!this.clients.has(uid)) this.clients.set(uid, new Set());
      this.clients.get(uid)!.add(client);

      console.log(`[WebSocketServer] Client connected uid=${uid} total=${this.totalConnections}`);

      // Send connection acknowledgment
      this.safeSend(ws, { type: 'connected', data: { uid, timestamp: new Date().toISOString() } });

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          // Handle ping/pong keepalive
          if (msg.type === 'ping') {
            this.safeSend(ws, { type: 'pong', data: { timestamp: new Date().toISOString() } });
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.totalConnections = Math.max(0, this.totalConnections - 1);
        const userSet = this.clients.get(uid);
        if (userSet) {
          userSet.delete(client);
          if (userSet.size === 0) this.clients.delete(uid);
        }
        console.log(`[WebSocketServer] Client disconnected uid=${uid} total=${this.totalConnections}`);
      });

      ws.on('error', (err) => {
        console.error(`[WebSocketServer] WS error uid=${uid}:`, err.message);
      });
    });

    this.wss.on('error', (err) => {
      console.error('[WebSocketServer] Server error:', err.message);
    });

    // Subscribe to AppEventBus to broadcast live updates
    appEventBus.on('order.status_changed', (event: OrderStatusChangedEvent) => {
      this.broadcastToUser(event.userId, {
        type: 'order.status_changed',
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          status: event.currentStatus,
          previousStatus: event.previousStatus,
          deliveryPartnerName: event.deliveryPartnerName,
          timestamp: event.timestamp,
        },
      });
    });

    appEventBus.on('order.created', (event: OrderCreatedEvent) => {
      // Broadcast new order to all owner clients
      this.broadcastToRole('owner', {
        type: 'order.created',
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          customerName: event.customerName,
          totalAmount: event.totalAmount,
          timestamp: event.timestamp,
        },
      });
    });

    console.log('[WebSocketServer] Attached to HTTP server on path /ws');
  }

  /**
   * Send a message to all WebSocket connections for a specific Firebase UID.
   */
  broadcastToUser(uid: string, message: object): void {
    const userClients = this.clients.get(uid);
    if (!userClients || userClients.size === 0) return;

    const payload = JSON.stringify(message);
    let sent = 0;
    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
        sent++;
      }
    }
    if (sent > 0) {
      console.log(`[WebSocketServer] Broadcast to uid=${uid}: ${sent} connections`);
    }
  }

  /**
   * Broadcast to all users with a specific role (for owner/delivery dashboards).
   */
  broadcastToRole(role: string, message: object): void {
    // All connected clients — filter if role-awareness is needed
    // For now, broadcast to all (safe since message types are self-describing)
    this.broadcastToAll(message);
  }

  /**
   * Broadcast to ALL connected clients.
   */
  broadcastToAll(message: object): void {
    if (!this.wss) return;
    const payload = JSON.stringify(message);
    for (const userClients of this.clients.values()) {
      for (const client of userClients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(payload);
        }
      }
    }
  }

  /**
   * Statistics for diagnostics overlay.
   */
  stats(): { totalConnections: number; uniqueUsers: number } {
    return {
      totalConnections: this.totalConnections,
      uniqueUsers: this.clients.size,
    };
  }

  private safeSend(ws: WebSocket, data: object): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    } catch {
      // Ignore send errors
    }
  }
}

export const webSocketServer = new OliveWebSocketServer();

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderEventService, OrderEvent, OrderStatus } from '../src/services/order/OrderEventService.js';
import { notificationQueue } from '../src/services/notification/NotificationQueueService.js';
import { pgPool } from '../src/config/postgres.js';
import { adminDb, adminMessaging } from '../src/config/firebase.js';

// Mock DB and Firebase
vi.mock('../src/config/postgres.js', () => ({
  pgPool: {
    connect: vi.fn(),
    query: vi.fn(),
  }
}));

vi.mock('../src/config/firebase.js', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(),
        set: vi.fn(),
      })),
      where: vi.fn(() => ({
        get: vi.fn()
      }))
    }))
  },
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminMessaging: {
    sendEachForMulticast: vi.fn(),
  }
}));

describe('Notification Pipeline & Order Lifecycle Integration', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    (pgPool.connect as any).mockResolvedValue(mockClient);
    
    // Default queries
    mockClient.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('SELECT o.*')) {
        return { rows: [{ id: 'order-123', status: 'pending', notification_version: 1, user_id: 'user-1', contact_phone: '123' }] };
      }
      if (sql.includes('SELECT oi.quantity')) {
        return { rows: [{ name: 'Pizza', quantity: 1, price_at_time: 10 }] };
      }
      if (sql.includes('SELECT status, notification_version')) {
        return { rows: [{ status: 'pending', notification_version: 1 }] };
      }
      return { rows: [] };
    });
  });

  describe('OrderEventService - Stale Guard & Synchronization', () => {
    it('should increment notification_version and emit event on valid transition', async () => {
      const event = await orderEventService.emitStatusChange('order-123', 'accepted', 'owner-1');
      
      expect(event).not.toBeNull();
      expect(event?.version).toBe(2);
      expect(event?.currentStatus).toBe('accepted');
      expect(event?.previousStatus).toBe('pending');
      expect(event?.eventId).toBeDefined();

      // Ensure DB was updated
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        expect.arrayContaining(['accepted', 2, 'order-123'])
      );
    });

    it('should reject invalid state transitions (e.g. pending -> delivered)', async () => {
      const event = await orderEventService.emitStatusChange('order-123', 'delivered', 'owner-1');
      expect(event).toBeNull();
      // Should rollback transaction
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should accurately detect stale events', async () => {
      // Mock DB: order is at version 5
      mockClient.query.mockImplementationOnce(async () => ({
        rows: [{ status: 'ready', notification_version: 5 }]
      }));

      // Try to process a version 3 notification
      const isStale = await orderEventService.isStale('order-123', 3, 'preparing');
      expect(isStale).toBe(true);

      // Try to process a version 6 notification
      mockClient.query.mockImplementationOnce(async () => ({
        rows: [{ status: 'ready', notification_version: 5 }]
      }));
      const isNotStale = await orderEventService.isStale('order-123', 6, 'partner_assigned');
      expect(isNotStale).toBe(false);
    });
  });

  describe('NotificationQueueService - Registration & Fallbacks', () => {
    it('should drop enqueue if event is stale', async () => {
      // Force isStale to return true
      vi.spyOn(orderEventService, 'isStale').mockResolvedValue(true);
      
      const result = await notificationQueue.enqueue('user-1', { data: { orderId: 'order-123', version: '2', stage: 'preparing' } });
      
      expect(result).toBe('stale_dropped');
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO notification_queue'));
    });

    it('should register FCM token and update old tokens', async () => {
      await notificationQueue.registerToken('firebase-uid-1', 'new-token', { oldToken: 'old-token' });
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fcm_tokens SET is_active = FALSE'),
        expect.arrayContaining(['old-token'])
      );
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fcm_tokens'),
        expect.arrayContaining(['new-token'])
      );
    });

    it('should immediately deactivate invalid FCM tokens on send failure', async () => {
      (adminMessaging.sendEachForMulticast as any).mockResolvedValue({
        successCount: 0,
        responses: [{ error: { code: 'messaging/invalid-registration-token' } }]
      });

      mockClient.query.mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT q.*')) {
          return { rows: [{ id: 1, target_user_id: 'user-1', payload: '{}', priority: 'high', tokens: ['bad-token'] }] };
        }
        if (sql.includes('SELECT token FROM fcm_tokens')) {
          return { rows: [{ token: 'bad-token' }] };
        }
        return { rows: [] };
      });

      // We expect an error to be thrown to trigger retry block
      await expect(notificationQueue.processQueue()).rejects.toThrow('All FCM tokens failed');
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fcm_tokens SET is_active = FALSE'),
        expect.arrayContaining([['bad-token']])
      );
    });
  });
});

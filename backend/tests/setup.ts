import { vi } from 'vitest';

// Mock Firebase Admin
vi.mock('../src/config/firebase.js', () => {
  return {
    adminAuth: {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-uid', role: 'owner' }),
      getUser: vi.fn().mockResolvedValue({ email: 'test@example.com' }),
    },
    adminDb: {
      collection: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: 'mock-id' }),
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ fcmTokens: ['token-123'], notificationRules: {}, role: 'owner' })
          }),
          update: vi.fn().mockResolvedValue(true),
          set: vi.fn().mockResolvedValue(true),
          onSnapshot: vi.fn((callback) => {
            callback({
              exists: true,
              data: () => ({ enabled: true })
            });
            return vi.fn(); // return unsubscribe function
          })
        })
      })
    },
    messaging: {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }]
      })
    }
  };
});

// Mock Postgres Pool
vi.mock('../src/config/postgres.js', () => {
  const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [{ role: 'owner' }], rowCount: 1 }),
    release: vi.fn()
  };
  return {
    pgPool: {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn().mockResolvedValue({ rows: [{ role: 'owner', count: '0', avg_sec: '0' }], rowCount: 1 })
    }
  };
});

// Mock db.js query (used by auth middleware)
vi.mock('../src/lib/db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [{ role: 'owner' }], rowCount: 1 })
}));

// Mock Email Service
vi.mock('../src/services/email.service.js', () => {
  return {
    queueEmail: vi.fn().mockResolvedValue(true),
    transporter: {
      sendMail: vi.fn().mockResolvedValue(true)
    }
  };
});

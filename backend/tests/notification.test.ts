import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { adminAuth, adminDb, messaging } from '../src/config/firebase.js';

describe('Notification API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue a custom notification and return 200', async () => {
    const response = await request(app)
      .post('/notifications/send-custom')
      .set('Authorization', 'Bearer fake-token')
      .send({
        title: 'Integration Test',
        body: 'Testing the queue',
        audience: 'all',
        category: 'system'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(adminAuth.verifyIdToken).toHaveBeenCalled();
  });

  it('should return diagnostics data on /debug', async () => {
    const response = await request(app)
      .get('/notifications/debug')
      .set('Authorization', 'Bearer fake-token');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('queueSize');
    expect(response.body).toHaveProperty('failedNotifications');
    expect(response.body).toHaveProperty('environment');
  });

  it('should reject requests without auth tokens', async () => {
    const response = await request(app)
      .post('/notifications/send-custom')
      .send({
        title: 'Fail',
        body: 'No token',
        audience: 'all'
      });

    // Our auth middleware might return 401 or 403
    expect([401, 403]).toContain(response.status);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { adminAuth } from '../src/config/firebase.js';

// Mock fetch globally for GitHub tests
global.fetch = vi.fn();

describe('GitHub Integration API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_TOKEN = 'mock-github-token';
  });

  it('should trigger a new APK build successfully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    const response = await request(app)
      .post('/github/build-apk')
      .set('Authorization', 'Bearer fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dispatches'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should fetch the latest build status', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        workflow_runs: [{
          status: 'in_progress',
          conclusion: null,
          run_number: 42
        }]
      })
    });

    const response = await request(app)
      .get('/github/build-status')
      .set('Authorization', 'Bearer fake-token');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('in_progress');
    expect(response.body.run_number).toBe(42);
  });

  it('should fetch the latest APK release', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Release v1.0',
        assets: [{
          name: 'app-release.apk',
          browser_download_url: 'https://github.com/download.apk',
          size: 1024
        }]
      })
    });

    const response = await request(app)
      .get('/github/latest-release')
      .set('Authorization', 'Bearer fake-token');

    expect(response.status).toBe(200);
    expect(response.body.apk.name).toBe('app-release.apk');
    expect(response.body.apk.download_url).toBe('https://github.com/download.apk');
  });
});

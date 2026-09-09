import { describe, it, expect } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';

describe('Olive Pizza Custom 404 Page Verification', () => {
  const notFoundFilePath = path.resolve(__dirname, '../pages/NotFound.tsx');
  const appFilePath = path.resolve(__dirname, '../App.tsx');
  const productDetailPath = path.resolve(__dirname, '../pages/ProductDetail.tsx');

  it('should have the dedicated NotFound component file', () => {
    expect(fs.existsSync(notFoundFilePath)).toBe(true);
  });

  it('should contain the required brand copy and food-themed visual cues', () => {
    const content = fs.readFileSync(notFoundFilePath, 'utf8');

    // Section copy requirements
    expect(content).toContain('Oops! This page got lost in the oven. 🍕');
    expect(content).toContain(
      "The page you're looking for doesn't exist, may have been moved, or is temporarily unavailable."
    );

    // 404 status indicator
    expect(content).toContain('Error 404 • Not Found');

    // Direct action buttons
    expect(content).toContain('Go Home');
    expect(content).toContain('View Menu');
    expect(content).toContain('Go Back');

    // Navigation routes
    expect(content).toContain('to="/"');
    expect(content).toContain('to="/menu"');

    // SEO tag with noIndex
    expect(content).toContain('<SEO');
    expect(content).toContain('noIndex={true}');

    // Accessibility & Motion
    expect(content).toContain('useReducedMotion');
    expect(content).toContain('role="img"');
    expect(content).toContain('aria-label=');
  });

  it('should not leak any internal routes, secrets, or server stack traces', () => {
    const content = fs.readFileSync(notFoundFilePath, 'utf8');

    // Forbidden leak patterns
    expect(content).not.toContain('localhost');
    expect(content).not.toContain('stackTrace');
    expect(content).not.toContain('INTERNAL_SERVER_ERROR');
    expect(content).not.toContain('api_key');
    expect(content).not.toContain('service_account');
    expect(content).not.toContain('onrender.com');
  });

  it('should wire the catch-all wildcard route in App.tsx to NotFound', () => {
    const appContent = fs.readFileSync(appFilePath, 'utf8');

    // Ensure NotFound is lazily imported
    expect(appContent).toMatch(/const NotFound = lazyWithRetry\(/);

    // Ensure wildcard route maps to NotFound inside MainLayout
    expect(appContent).toContain('<Route path="*" element={<Suspense fallback={<PizzaLoader />}><NotFound /></Suspense>} />');

    // Ensure the old silent redirect is removed
    expect(appContent).not.toContain('<Route path="*" element={<Navigate to="/" replace />} />');
  });

  it('should handle missing products gracefully in ProductDetail.tsx', () => {
    const productDetailContent = fs.readFileSync(productDetailPath, 'utf8');

    // Ensure NotFound is imported and rendered on missing product
    expect(productDetailContent).toMatch(/import NotFound from ["'].\/NotFound["']/);
    expect(productDetailContent).toContain('setNotFound(true)');
    expect(productDetailContent).toContain('<NotFound');
    expect(productDetailContent).toContain('isProductNotFound={true}');
  });
});

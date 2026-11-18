import { describe, it, expect } from 'vitest';
import { sanitizeAndHumanizeNotification } from '../components/notifications/Customer3DNotification';

describe('Customer3DNotification Filter & Humanizer', () => {
  describe('Mandatory R2 Operational Alert Suppression', () => {
    it('suppresses internal operational stage "dispatch_failed"', () => {
      const res = sanitizeAndHumanizeNotification('Notice', 'Internal failure', { stage: 'dispatch_failed' });
      expect(res.isDrop).toBe(true);
      expect(res.title).toBe('');
    });

    it('suppresses internal operational stage "rider_shortage"', () => {
      const res = sanitizeAndHumanizeNotification('Notice', 'No couriers available', { stage: 'rider_shortage' });
      expect(res.isDrop).toBe(true);
    });

    it('suppresses internal operational status "dispatch_failed" when passed under status key', () => {
      const res = sanitizeAndHumanizeNotification('Notice', 'Internal failure', { status: 'dispatch_failed' });
      expect(res.isDrop).toBe(true);
    });

    it('suppresses stage containing error keyword', () => {
      const res = sanitizeAndHumanizeNotification('Notice', 'Internal failure', { stage: 'db_error_abort' });
      expect(res.isDrop).toBe(true);
    });

    it('suppresses stage containing alarm keyword', () => {
      const res = sanitizeAndHumanizeNotification('Notice', 'Internal failure', { stage: 'pos_alarm_timeout' });
      expect(res.isDrop).toBe(true);
    });

    it('suppresses stage containing retry keyword', () => {
      const res = sanitizeAndHumanizeNotification('Notice', 'Internal failure', { stage: 'retry_dispatch' });
      expect(res.isDrop).toBe(true);
    });

    it('suppresses title containing rider identifier (e.g. rider_01)', () => {
      const res = sanitizeAndHumanizeNotification('Order update: rider_01 assigned', 'Food is on the way', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses title containing kitchen queue backlog', () => {
      const res = sanitizeAndHumanizeNotification('kitchen queue backlog', 'Preparing food', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses title containing courier keyword', () => {
      const res = sanitizeAndHumanizeNotification('Courier assigned to pickup', 'Heading to store', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses title containing shortage keyword', () => {
      const res = sanitizeAndHumanizeNotification('Shortage alert in hub', 'Checking inventory', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses title containing dispatch keyword', () => {
      const res = sanitizeAndHumanizeNotification('Dispatch system rebalancing', 'Optimizing routes', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses body containing rider keyword', () => {
      const res = sanitizeAndHumanizeNotification('Order update', 'Assigning nearest rider to pickup', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses body containing shortage keyword', () => {
      const res = sanitizeAndHumanizeNotification('Order update', 'Experiencing ingredient shortage at branch', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses body containing dispatch keyword', () => {
      const res = sanitizeAndHumanizeNotification('Order update', 'Waiting on manual dispatch resolution', {});
      expect(res.isDrop).toBe(true);
    });

    it('suppresses non-customer targetApp payloads', () => {
      const res = sanitizeAndHumanizeNotification('Order Received', 'New order arrived', { targetApp: 'restaurant_manager' });
      expect(res.isDrop).toBe(true);
    });

    it('suppresses actionable alarm category payloads', () => {
      const res = sanitizeAndHumanizeNotification('Order Alert', 'Accept immediately', { category: 'alarm_actionable' });
      expect(res.isDrop).toBe(true);
    });
  });

  describe('Legitimate Customer Lifecycle Event Preservation', () => {
    it('preserves and humanizes order placed event', () => {
      const res = sanitizeAndHumanizeNotification('Order Placed', 'Baking your artisan pizza', { stage: 'placed' });
      expect(res.isDrop).toBe(false);
      expect(res.badgeText).toBe('Order Received');
      expect(res.title).toContain('Artisan Order Received');
    });

    it('preserves and humanizes order confirmed event', () => {
      const res = sanitizeAndHumanizeNotification('Order Confirmed', 'Your delicious meal is accepted', { stage: 'confirmed' });
      expect(res.isDrop).toBe(false);
      expect(res.badgeText).toBe('Chef Confirmed');
      expect(res.title).toContain('Master Chef Confirmed');
    });

    it('preserves and humanizes order cooking event', () => {
      const res = sanitizeAndHumanizeNotification('Baking in Stone Ovens', 'Your order is being freshly prepared', { stage: 'cooking' });
      expect(res.isDrop).toBe(false);
      expect(res.badgeText).toBe('Stone Oven Baking');
      expect(res.title).toContain('Stone-Oven Baking');
    });

    it('preserves and humanizes order packed event', () => {
      const res = sanitizeAndHumanizeNotification('Order Ready for Delivery', 'Your order is freshly packed and ready', { stage: 'packed' });
      expect(res.isDrop).toBe(false);
      expect(res.badgeText).toBe('Piping Hot & Ready');
    });

    it('preserves and humanizes out for delivery event', () => {
      const res = sanitizeAndHumanizeNotification('Out for Delivery!', 'Your delivery partner is on the way to your address.', {
        stage: 'out_for_delivery',
        deliveryPartnerName: 'Samyak S.',
      });
      expect(res.isDrop).toBe(false);
      expect(res.badgeText).toBe('On The Way');
      expect(res.body).toContain('Samyak S.');
    });

    it('preserves and humanizes order delivered event', () => {
      const res = sanitizeAndHumanizeNotification('Delivered! Enjoy your pizza', 'Your order has been delivered', { stage: 'delivered' });
      expect(res.isDrop).toBe(false);
      expect(res.badgeText).toBe('Delivered');
    });

    it('preserves and humanizes order delay notification', () => {
      const res = sanitizeAndHumanizeNotification('Delivery Update • Order #1001', 'Your order is experiencing a slight delay', { stage: 'delay' });
      expect(res.isDrop).toBe(false);
      expect(res.badgeText).toBe('Perfecting Crunch');
    });
  });
});

import * as admin from 'firebase-admin';

export class NotificationTemplates {
  static readonly COLLAPSE_KEY_ORDER = 'order_'; // Appended with orderId

  /**
   * Stage 1: New Order (Owner)
   */
  static newOrder(orderId: string, payload: any): any {
    return {
      notification: {
        title: `🍕 New Order: ${payload.customerName}`,
        body: `₹${payload.totalAmount} • ${payload.itemsCount} Items • ${payload.paymentMethod}`,
        sound: 'default'
      },
      data: {
        stage: 'new_order',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for FCM PWA
      }
    };
  }

  /**
   * Stage 2: Kitchen Control (Owner)
   */
  static kitchenControl(orderId: string, payload: any): any {
    return {
      notification: {
        title: `👨‍🍳 Cooking Control: ${payload.customerName}`,
        body: `Ready to start cooking? Estimated prep: ${payload.prepTime || '15'} mins.`,
        sound: 'default'
      },
      data: {
        stage: 'kitchen_control',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };
  }

  /**
   * Stage 3: Assign Delivery (Owner)
   */
  static assignDelivery(orderId: string, payload: any): any {
    return {
      notification: {
        title: `🚚 Assign Delivery`,
        body: `Order ready for ${payload.customerName}. Available partners: ${payload.availableCount}`,
        sound: 'default'
      },
      data: {
        stage: 'assign_delivery',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };
  }

  /**
   * Stage 4: Delivery Assigned (Partner)
   */
  static deliveryAssigned(orderId: string, payload: any): any {
    return {
      notification: {
        title: `📦 Delivery Assigned!`,
        body: `${payload.distance} away • COD/Paid: ${payload.paymentMethod}`,
        sound: 'default'
      },
      data: {
        stage: 'delivery_assigned',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };
  }

  /**
   * Stage 5: Navigate to Restaurant (Partner)
   */
  static navigateToRestaurant(orderId: string, payload: any): any {
    return {
      notification: {
        title: `📍 Pick up from Restaurant`,
        body: `Head to ${payload.restaurantAddress}`,
        sound: 'default'
      },
      data: {
        stage: 'navigate_restaurant',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };
  }

  /**
   * Stage 6: Arrived Restaurant (Partner)
   */
  static arrivedRestaurant(orderId: string, payload: any): any {
    return {
      notification: {
        title: `✅ Arrived at Restaurant`,
        body: `Confirm pickup for ${payload.customerName}'s order.`,
        sound: 'default'
      },
      data: {
        stage: 'arrived_restaurant',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };
  }

  /**
   * Stage 7 & 8: Picked Up / Start Delivery (Partner)
   */
  static startDelivery(orderId: string, payload: any): any {
    return {
      notification: {
        title: `🚀 Out for Delivery`,
        body: `Deliver to: ${payload.deliveryAddress}`,
        sound: 'default'
      },
      data: {
        stage: 'start_delivery',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };
  }

  /**
   * Stage 9: Arrived Customer (Partner)
   */
  static arrivedCustomer(orderId: string, payload: any): any {
    return {
      notification: {
        title: `🏁 Arrived at Destination`,
        body: `Complete delivery for ${payload.customerName}.`,
        sound: 'default'
      },
      data: {
        stage: 'arrived_customer',
        orderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };
  }
}

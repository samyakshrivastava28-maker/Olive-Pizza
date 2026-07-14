import { adminDb } from '../../config/firebase.js';
import { qdrantService } from './QdrantService.js';
import { semanticSearch } from './SemanticSearch.js';
import kb from '../KnowledgeBaseService.js';

export class RecommendationEngine {
  /**
   * Fetches the user's order history and securely builds a recommendation profile.
   * Absolutely no cross-user data is ever queried or exposed here.
   */
  public async getUserProfileContext(userId: string): Promise<string> {
    if (!userId) return '';

    try {
      // Fetch only the authenticated user's recent orders (limit 15)
      const ordersSnap = await adminDb
        .collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(15)
        .get();

      // Fetch user's current cart
      const cartSnap = await adminDb
        .collection('users')
        .doc(userId)
        .collection('cart')
        .get();
      
      let cartContext = '';
      if (!cartSnap.empty) {
        let cartTotal = 0;
        const cartItems = cartSnap.docs.map(d => {
          const item = d.data();
          cartTotal += (item.price || 0) * (item.quantity || 1);
          return `${item.quantity}x ${item.name}`;
        });
        cartContext = `ACTIVE CART:
The user currently has items in their cart:
- Items: ${cartItems.join(', ')}
- Estimated Cart Total: ₹${cartTotal}
If they ask about checkout or their cart, you can remind them what they have ready to order.`;
      }

      if (ordersSnap.empty) {
        return `USER PROFILE: The user is a new customer. Recommend popular or signature items. Encourage them to try best-sellers.\n\n${cartContext}`;
      }

      const orders = ordersSnap.docs.map((d: any) => d.data());
      
      let totalSpent = 0;
      const productCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      let activeOrder: any = null;
      let lastOrderDate = '';

      orders.forEach((o: any, index: number) => {
        if (index === 0) lastOrderDate = new Date(o.createdAt).toLocaleDateString();
        
        // Track active order
        if (['pending', 'accepted', 'preparing', 'out_for_delivery'].includes(o.status)) {
          activeOrder = o;
        }

        totalSpent += (o.totalAmount || 0);

        (o.items || []).forEach((item: any) => {
          productCounts[item.name] = (productCounts[item.name] || 0) + 1;
          if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
          }
        });
      });

      const avgSpending = orders.length > 0 ? Math.round(totalSpent / orders.length) : 0;
      
      // Sort favorites
      const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);
        
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(e => e[0]);

      let context = `USER PROFILE (STRICTLY PRIVATE TO THIS USER):
- Previous Orders: ${orders.length}
- Average Spending: ₹${avgSpending}
- Favorite Products: ${topProducts.join(', ') || 'N/A'}
- Favorite Categories: ${topCategories.join(', ') || 'N/A'}
- Last Order Date: ${lastOrderDate}

RECOMMENDATION RULES:
If the user asks "What should I eat?" or requests recommendations:
1. Mention their past favorites (e.g. "I see you love ${topProducts[0]}...").
2. Suggest 2-3 current menu items that match their favorite categories or complement their past orders.
3. If there are running offers/coupons applicable to these suggestions, mention them!
`;

      if (activeOrder) {
        context += `\nACTIVE RUNNING ORDER:
The user currently has an order in progress.
- Status: ${activeOrder.status}
- Total: ₹${activeOrder.totalAmount}
- Estimated Arrival: ${activeOrder.estimatedDeliveryTime || '30-45 mins'}
If they ask about their order, assure them of its status without exposing internal database IDs or delivery partner private phones.
`;
      }

      if (cartContext) {
        context += `\n${cartContext}\n`;
      }

      return context;

    } catch (err: any) {
      console.error('[RecommendationEngine] Failed to build user profile:', err.message);
      return '';
    }
  }

  /**
   * Builds context for Delivery Partners
   */
  public async getDeliveryPartnerContext(partnerId: string): Promise<string> {
    if (!partnerId) return '';
    try {
      const activeDeliveriesSnap = await adminDb
        .collection('orders')
        .where('deliveryPartnerId', '==', partnerId)
        .where('status', 'in', ['accepted', 'preparing', 'out_for_delivery'])
        .get();
        
      const count = activeDeliveriesSnap.empty ? 0 : activeDeliveriesSnap.size;
      return `DELIVERY PARTNER CONTEXT:
You have ${count} active assigned deliveries.
Help the delivery partner navigate, update statuses, or understand policies. Do not reveal customer private information other than the delivery address required for current active orders.`;
    } catch (err) {
      return '';
    }
  }

  /**
   * Builds context for Owners
   */
  public async getOwnerContext(): Promise<string> {
    const stats = kb.getStats();
    return `OWNER / ADMIN CONTEXT:
You are speaking to the restaurant owner.
System Health:
- Total Indexed Products: ${stats.productCount}
- Active Coupons: ${stats.couponCount}
- Knowledge Sync Status: Active
You may provide business analytics, sales advice, or menu optimization suggestions.`;
  }
}

export const recommendationEngine = new RecommendationEngine();

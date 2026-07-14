import { adminDb } from '../../config/firebase.js';
import { knowledgeIndexer, DocumentMetadata } from './KnowledgeIndexer.js';
import { qdrantService } from './QdrantService.js';
import kb from '../KnowledgeBaseService.js'; // The local in-memory KB that caches Firestore

export class KnowledgeSync {
  
  public async syncAll(): Promise<{ success: boolean; stats: any }> {
    try {
      console.log('[KnowledgeSync] Starting full sync to Qdrant...');
      
      // We can use the existing KnowledgeBaseService cache, or fetch fresh from Firestore
      // For a massive sync, it's safer to use the KB's getStats to see what's there,
      // but let's fetch directly from the local KB cache which is already synced with Firestore.
      
      let indexedCount = 0;
      
      // 1. Sync Settings
      const settings = kb.getSettings();
      if (settings) {
         const text = `Restaurant Name: ${settings.restaurantName}
Address: ${settings.address}
Phone: ${settings.phone}
Email: ${settings.email || 'N/A'}
Opening Time: ${settings.openingTime || 'N/A'}
Closing Time: ${settings.closingTime || 'N/A'}
Currently Open: ${settings.isOpen ? 'Yes' : 'No'}
Delivery Radius: ${settings.deliveryRadius || 5} km
Min Order Amount: ₹${settings.minOrderAmount || 0}
Delivery Charge: ₹${settings.deliveryCharge || 0}
Free Delivery Above: ₹${settings.freeDeliveryAbove || 0}
Estimated Delivery Time: ${settings.estimatedDeliveryTime || 'N/A'}
Accepted Payments: ${(settings.acceptedPayments || []).join(', ')}`;

         await knowledgeIndexer.indexText(text, {
           documentId: 'restaurant-settings',
           documentType: 'text',
           source: 'firestore:settings',
           category: 'Business Settings',
           version: settings._indexedAt,
         });
         indexedCount++;
      }

      // 2. Sync Policies
      const policies = kb.getAllPolicies();
      for (const policy of policies) {
        await knowledgeIndexer.indexText(policy.content, {
          documentId: `policy-${policy.id}`,
          documentType: 'text',
          source: 'firestore:policies',
          category: 'Policy',
          tags: [policy.title],
          version: policy._indexedAt,
        });
        indexedCount++;
      }

      // 3. Sync FAQs
      const faqs = kb.getAllFaqs();
      for (const faq of faqs) {
        const text = `Q: ${faq.question}\nA: ${faq.answer}`;
        await knowledgeIndexer.indexText(text, {
          documentId: `faq-${faq.id}`,
          documentType: 'text',
          source: 'firestore:faqs',
          category: 'FAQ',
          tags: [faq.category || 'General'],
          version: faq._indexedAt,
        });
        indexedCount++;
      }

      // 4. Sync Menu Products
      const products = kb.getAllProducts();
      for (const p of products) {
        const text = `Product: ${p.name}
Category: ${p.category}
Price: ₹${p.price}
Discounted Price: ₹${p.discountedPrice || p.price}
Available: ${p.isAvailable ? 'Yes' : 'No'}
Vegetarian: ${p.isVeg ? 'Yes' : 'No'}
Spicy: ${p.isSpicy ? 'Yes' : 'No'}
Ingredients: ${p.ingredients || 'N/A'}
Description: ${p.description}
Preparation Time: ${p.preparationTime || 15} mins
Sizes: ${(p.sizes || []).join(', ')}
Toppings: ${(p.toppings || []).join(', ')}`;
        
        await knowledgeIndexer.indexText(text, {
          documentId: `product-${p.id}`,
          documentType: 'text',
          source: 'firestore:products',
          category: 'Menu Product',
          tags: [p.category, p.name],
          version: p._indexedAt,
        });
        indexedCount++;
      }

      // 5. Sync Coupons
      const coupons = kb.getAllCoupons();
      for (const c of coupons) {
        if (!c.isActive) continue;
        const text = `Coupon Code: ${c.code}
Description: ${c.description}
Discount: ${c.discountType === 'percent' ? c.discountValue + '%' : '₹' + c.discountValue}
Minimum Order: ₹${c.minOrder || 0}`;

        await knowledgeIndexer.indexText(text, {
          documentId: `coupon-${c.id}`,
          documentType: 'text',
          source: 'firestore:coupons',
          category: 'Coupon',
          tags: [c.code],
          version: c._indexedAt,
        });
        indexedCount++;
      }

      console.log(`[KnowledgeSync] Successfully synced ${indexedCount} internal business records to Qdrant.`);
      
      return {
        success: true,
        stats: {
          syncedRecords: indexedCount,
        }
      };
    } catch (error: any) {
      console.error('[KnowledgeSync] Sync failed:', error.message);
      return { success: false, stats: null };
    }
  }

  public async syncProduct(productId: string): Promise<void> {
    const p = kb.getAllProducts().find((x: any) => x.id === productId);
    if (!p) {
       await qdrantService.deleteDocument(`product-${productId}`);
       return;
    }
    const text = `Product: ${p.name}
Category: ${p.category}
Price: ₹${p.price}
Discounted Price: ₹${p.discountedPrice || p.price}
Available: ${p.isAvailable ? 'Yes' : 'No'}
Description: ${p.description}`;
    await knowledgeIndexer.indexText(text, {
      documentId: `product-${p.id}`,
      documentType: 'text',
      source: 'firestore:products',
      category: 'Menu Product',
      tags: [p.category, p.name],
      version: Date.now(),
    });
  }
  public async syncCoupon(couponId: string): Promise<void> {
    const c = kb.getAllCoupons().find((x: any) => x.id === couponId);
    if (!c || !c.isActive) {
       await qdrantService.deleteDocument(`coupon-${couponId}`);
       return;
    }
    const text = `Coupon Code: ${c.code}\nDescription: ${c.description}\nDiscount: ${c.discountType === 'percent' ? c.discountValue + '%' : '₹' + c.discountValue}\nMinimum Order: ₹${c.minOrder || 0}`;
    await knowledgeIndexer.indexText(text, {
      documentId: `coupon-${c.id}`,
      documentType: 'text',
      source: 'firestore:coupons',
      category: 'Coupon',
      tags: [c.code],
      version: Date.now(),
    });
  }

  public async syncSetting(): Promise<void> {
    const settings = kb.getSettings();
    if (!settings) return;
    const text = `Restaurant Name: ${settings.restaurantName}\nAddress: ${settings.address}\nPhone: ${settings.phone}\nEmail: ${settings.email || 'N/A'}\nOpening Time: ${settings.openingTime || 'N/A'}\nClosing Time: ${settings.closingTime || 'N/A'}\nCurrently Open: ${settings.isOpen ? 'Yes' : 'No'}\nDelivery Radius: ${settings.deliveryRadius || 5} km\nMin Order Amount: ₹${settings.minOrderAmount || 0}\nDelivery Charge: ₹${settings.deliveryCharge || 0}\nFree Delivery Above: ₹${settings.freeDeliveryAbove || 0}\nEstimated Delivery Time: ${settings.estimatedDeliveryTime || 'N/A'}\nAccepted Payments: ${(settings.acceptedPayments || []).join(', ')}`;
    await knowledgeIndexer.indexText(text, {
      documentId: 'restaurant-settings',
      documentType: 'text',
      source: 'firestore:settings',
      category: 'Business Settings',
      version: Date.now(),
    });
  }

  public async syncFaq(faqId: string): Promise<void> {
    const faq = kb.getAllFaqs().find((x: any) => x.id === faqId);
    if (!faq) {
       await qdrantService.deleteDocument(`faq-${faqId}`);
       return;
    }
    const text = `Q: ${faq.question}\nA: ${faq.answer}`;
    await knowledgeIndexer.indexText(text, {
      documentId: `faq-${faq.id}`,
      documentType: 'text',
      source: 'firestore:faqs',
      category: 'FAQ',
      tags: [faq.category || 'General'],
      version: Date.now(),
    });
  }
}

export const knowledgeSync = new KnowledgeSync();

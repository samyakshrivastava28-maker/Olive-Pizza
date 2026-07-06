import { Order, CartItem } from '../../../frontend/src/types/models';

const BRAND_COLOR = '#4a5d23'; // Premium Olive Green
const BRAND_ORANGE = '#f97316';
const BRAND_DARK = '#0B0F14';

// Helper to render product cards
const renderProductCards = (items: CartItem[]) => {
  return items.map(item => `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; gap: 16px; align-items: center;">
      <img src="${item.image || 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png'}" width="80" height="80" style="border-radius: 8px; object-fit: cover;" />
      <div style="flex: 1;">
        <h4 style="margin: 0 0 4px 0; color: #ffffff; font-size: 16px;">${item.name}</h4>
        <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">
          ${item.quantity}x • ${item.variant || 'Regular'} ${item.crust ? `• ${item.crust}` : ''}
        </div>
        ${item.addons && item.addons.length > 0 ? `<div style="color: #64748b; font-size: 11px;">+ ${item.addons.join(', ')}</div>` : ''}
      </div>
      <div style="font-weight: bold; color: ${BRAND_COLOR};">₹${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');
};

// Helper for timeline
const renderTimeline = (activeStep: number) => {
  const steps = ['Placed', 'Confirmed', 'Preparing', 'Packed', 'Out For Delivery', 'Delivered'];
  return `
    <div style="margin: 30px 0; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 16px;">
      ${steps.map((step, index) => {
        const isPassed = index <= activeStep;
        const isActive = index === activeStep;
        return `
          <div style="display: flex; align-items: center; margin-bottom: ${index === steps.length - 1 ? '0' : '12px'};">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${isPassed ? BRAND_COLOR : '#334155'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; margin-right: 12px;">
              ${isPassed ? '✓' : ''}
            </div>
            <div style="color: ${isActive ? BRAND_COLOR : (isPassed ? '#f8fafc' : '#64748b')}; font-weight: ${isActive ? 'bold' : 'normal'};">
              ${step}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// Helper for billing
const renderBilling = (order: Order) => {
  return `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #334155;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #94a3b8; font-size: 14px;">
        <span>Subtotal</span>
        <span>₹${(order.totalAmount - (order.deliveryFee || 0)).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #94a3b8; font-size: 14px;">
        <span>Delivery Charge</span>
        <span>₹${(order.deliveryFee || 0).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 16px; color: #ffffff; font-size: 18px; font-weight: bold;">
        <span>Grand Total</span>
        <span style="color: ${BRAND_COLOR};">₹${order.totalAmount.toFixed(2)}</span>
      </div>
    </div>
  `;
};

// Helper for customer details
const renderCustomerDetails = (order: Order) => {
  return `
    <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px; margin: 24px 0;">
      <h3 style="color: #ffffff; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Customer Details</h3>
      <p style="margin: 0 0 4px 0; color: #cbd5e1;"><strong>Name:</strong> ${order.customerInfo?.name || order.customerName}</p>
      <p style="margin: 0 0 4px 0; color: #cbd5e1;"><strong>Phone:</strong> ${order.contactPhone || order.customerInfo?.phone}</p>
      <p style="margin: 0 0 4px 0; color: #cbd5e1;"><strong>Address:</strong> ${order.deliveryAddress?.addressLine || order.address || 'Takeaway'}</p>
      <p style="margin: 0; color: #cbd5e1;"><strong>Payment:</strong> <span style="color: ${BRAND_COLOR};">Paid</span></p>
    </div>
  `;
};


export const buildOrderPlacedEmail = (order: Order) => {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80" style="width: 100%; height: 200px; object-fit: cover; border-radius: 16px; margin-bottom: 20px;" />
      <h1 style="color: ${BRAND_COLOR}; margin: 0 0 8px 0;">Order Placed Successfully!</h1>
      <p style="color: #94a3b8; font-size: 16px; margin: 0;">Thank you for choosing Olive Pizza. Your order #${order.dailyOrderNumber} is confirmed.</p>
    </div>

    ${renderCustomerDetails(order)}
    
    <h3 style="color: #ffffff; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Order Items</h3>
    ${renderProductCards(order.items)}
    
    ${renderBilling(order)}

    <div style="text-align: center; margin-top: 40px;">
      <a href="https://olivepizza.app/tracking/${order.id}" style="background-color: ${BRAND_COLOR}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Track Order</a>
    </div>
  `;
};

export const buildOrderConfirmedEmail = (order: Order) => {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: ${BRAND_COLOR}; margin: 0 0 8px 0;">We're preparing your food!</h1>
      <p style="color: #94a3b8; font-size: 16px; margin: 0;">Your order #${order.dailyOrderNumber} has been confirmed and our chefs are on it.</p>
    </div>

    ${renderTimeline(2)}

    ${renderCustomerDetails(order)}
    
    <h3 style="color: #ffffff; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Order Summary</h3>
    ${renderProductCards(order.items)}
    
    ${renderBilling(order)}

    <div style="text-align: center; margin-top: 40px;">
      <a href="https://olivepizza.app/tracking/${order.id}" style="background-color: ${BRAND_COLOR}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Track Live Order</a>
    </div>
  `;
};

export const buildDeliveryPartnerAssignedEmail = (order: Order, partnerName: string, partnerPhoto: string, vehicleInfo: string) => {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: ${BRAND_COLOR}; margin: 0 0 8px 0;">Your delivery partner is on the way!</h1>
      <p style="color: #94a3b8; font-size: 16px; margin: 0;">Your order #${order.dailyOrderNumber} is picked up and out for delivery.</p>
    </div>

    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; display: flex; gap: 20px; align-items: center; margin-bottom: 30px;">
      <img src="${partnerPhoto || 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png'}" width="64" height="64" style="border-radius: 50%; object-fit: cover; border: 2px solid ${BRAND_COLOR};" />
      <div>
        <h3 style="margin: 0 0 4px 0; color: #ffffff;">${partnerName}</h3>
        <p style="margin: 0; color: #94a3b8; font-size: 14px;">${vehicleInfo || 'Delivery Partner'}</p>
      </div>
    </div>

    ${renderTimeline(4)}

    <h3 style="color: #ffffff; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Order Summary</h3>
    ${renderProductCards(order.items)}

    <div style="text-align: center; margin-top: 40px;">
      <a href="https://olivepizza.app/tracking/${order.id}" style="background-color: ${BRAND_ORANGE}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Track Live on Map</a>
    </div>
  `;
};

export const buildOrderDeliveredEmail = (order: Order, recommendedProducts: any[] = []) => {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&q=80" style="width: 100%; height: 200px; object-fit: cover; border-radius: 16px; margin-bottom: 20px;" />
      <h1 style="color: ${BRAND_COLOR}; margin: 0 0 8px 0;">Enjoy your meal! 🎉</h1>
      <p style="color: #94a3b8; font-size: 16px; margin: 0;">Your order #${order.dailyOrderNumber} has been delivered successfully.</p>
    </div>

    ${renderBilling(order)}

    <div style="text-align: center; margin-top: 40px; display: flex; gap: 12px; justify-content: center;">
      <a href="https://olivepizza.app/dashboard?rate=${order.id}" style="background-color: ${BRAND_COLOR}; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">⭐ Rate Order</a>
      <a href="https://olivepizza.app/menu?reorder=${order.id}" style="background-color: rgba(255,255,255,0.1); color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 1px solid rgba(255,255,255,0.2);">🔁 Reorder</a>
    </div>

    ${recommendedProducts && recommendedProducts.length > 0 ? `
    <div style="margin-top: 50px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px;">
      <h3 style="color: #ffffff; text-align: center; margin: 0 0 20px 0; font-size: 18px;">You Might Also Like</h3>
      ${recommendedProducts.map(p => `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; gap: 16px; align-items: center;">
          <img src="${p.image || 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png'}" width="80" height="80" style="border-radius: 8px; object-fit: cover;" />
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; color: #ffffff; font-size: 16px;">${p.name || p.productName}</h4>
            <div style="color: ${BRAND_COLOR}; font-weight: bold; font-size: 14px;">₹${(p.basePrice || p.price || 0).toFixed(2)}</div>
          </div>
          <a href="https://olivepizza.app/menu" style="background-color: rgba(249,115,22,0.1); color: ${BRAND_ORANGE}; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px;">View</a>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;
};

export interface MenuItem {
  id?: string;
  name: string;
  description: string;
  category: 'pizza' | 'sides' | 'beverage' | 'dessert' | 'combo';
  pricingMode?: 'fixed' | 'offer';
  basePrice: number;
  offerPrice?: number;
  discountPercentage?: number;
  image: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  productIds?: string[];
  variants?: {
    name: string;
    price: number;
  }[];
  crusts?: {
    name: string;
    price: number;
  }[];
  addons?: {
    name: string;
    price: number;
  }[];
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  variant?: string;
  crust?: string;
  addons?: string[];
  image: string;
  isVegetarian?: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'customer' | 'owner' | 'delivery_partner' | 'admin';
  fullAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  
  // Delivery Partner Specific Fields
  approvalStatus?: 'pending' | 'approved' | 'suspended';
  status?: 'online' | 'offline' | 'busy' | 'break';
  vehicleType?: string;
  vehicleNumber?: string;
  photoUrl?: string;
  joinedAt?: string;
  
  earnings?: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    today: number;
    pendingPayout: number;
  };
  
  metrics?: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    totalTimeTaken: number;
    fastestDelivery: number;
    ratingSum: number;
    ratingCount: number;
  };
  
  liveLocation?: {
    lat: number;
    lng: number;
    heading?: number | null;
    speed?: number | null;
    updatedAt: string;
  };
  
  // FCM Notification Fields
  fcmTokens?: string[];
  notificationEnabled?: boolean;
  lastTokenUpdate?: string;
  deviceName?: string;
  platform?: string;
  browser?: string;
}

export interface NotificationState {
  id?: string; // Order ID usually
  stage: 'new_order' | 'kitchen_control' | 'assign_delivery' | 'delivery_assigned' | 'navigate_restaurant' | 'arrived_restaurant' | 'picked_up' | 'on_the_way' | 'arrived_customer' | 'delivered';
  targetUserId: string; // Owner ID or Delivery Partner ID
  orderId: string;
  payload: any;
  createdAt: string;
  updatedAt: string;
  alarmActive: boolean;
  retryCount: number;
}

export interface Order {
  id?: string;
  dailyOrderNumber?: string;
  permanentOrderId?: string;
  userId: string;
  customerName?: string;
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
  };
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'partner_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryAddress?: {
    addressLine: string;
    landmark?: string;
    pincode: string;
    lat?: number;
    lng?: number;
  };
  address?: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
  deliveryPartnerId?: string;
  
  orderTiming?: 'now' | 'scheduled';
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  noContactDelivery?: boolean;
  
  // Cancellation
  cancellationReason?: string;
  cancelledAt?: string;
  
  // Delivery partner tracking
  declinedPartnerIds?: string[];
  
  // Daily order number
  orderDateLocal?: string;
  
  // Proof of delivery
  deliveryProof?: {
    photoUrl?: string;
    note?: string;
    signatureUrl?: string;
  };
  deliveryRating?: {
    score: number;
    review?: string;
    createdAt: string;
  };
  pickedUpAt?: string;
  deliveredAt?: string;
  deliveryFee?: number;
  
  // POS Alert Tracking Fields
  alertSent?: boolean;
  firstAlertAt?: string | null;
  secondAlertAt?: string | null;
  urgentAlertAt?: string | null;
}

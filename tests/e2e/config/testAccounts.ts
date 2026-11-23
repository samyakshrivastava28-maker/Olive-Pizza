/**
 * Layerbase PostgreSQL Verified Accounts & Branch Fixtures
 * Verified directly against live PostgreSQL `app_users` and `restaurant_branches`
 */

export interface TestUserAccount {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: 'platform_owner' | 'owner' | 'restaurant_manager' | 'rider' | 'customer' | 'pos';
  branchId: string;
  franchiseId?: string;
  deliveryPartnerId?: string;
  allowedApps: string[];
}

export const TEST_ACCOUNTS: Record<string, TestUserAccount> = {
  // 1. Platform Owner
  PLATFORM_OWNER: {
    id: '6tLLR6q7aTYqzTG2blRx3TU5sA42',
    email: 'webhub2811@gmail.com',
    phone: '9179944445',
    name: 'Samyak Shrivastava (Platform Owner)',
    role: 'platform_owner',
    branchId: 'all',
    franchiseId: 'all',
    allowedApps: ['OWNER', 'FRANCHISE_MANAGER', 'RESTAURANT_MANAGER', 'POS', 'DELIVERY', 'CUSTOMER'],
  },

  // 2. Owner
  OWNER: {
    id: 'usr_owner_olive',
    email: 'olivepizzarjn@gmail.com',
    phone: '9876543210',
    name: 'Olive Pizza Master Owner',
    role: 'owner',
    branchId: 'all',
    franchiseId: 'all',
    allowedApps: ['OWNER', 'FRANCHISE_MANAGER', 'RESTAURANT_MANAGER', 'POS', 'DELIVERY', 'CUSTOMER'],
  },

  // 3. Restaurant Manager
  MANAGER: {
    id: 'usr_mgr_rjn_samyak',
    email: 'samyakshrivastava28@gmail.com',
    phone: '+919876543212',
    name: 'Samyak Manager RJN',
    role: 'restaurant_manager',
    branchId: 'branch_rjn_main',
    franchiseId: 'fra_rajnandgaon',
    allowedApps: ['RESTAURANT_MANAGER', 'POS'],
  },

  // 4. Delivery Partner / Rider
  RIDER: {
    id: 'usr_rider1_samyak',
    deliveryPartnerId: 'dp_rjn_samyak_01',
    email: 'samyaks695@gmail.com',
    phone: '+919876543211',
    name: 'Samyak Rider',
    role: 'rider',
    branchId: 'branch_rjn_main',
    franchiseId: 'fra_rajnandgaon',
    allowedApps: ['DELIVERY'],
  },

  // 5. Customer
  CUSTOMER: {
    id: 'zRZ60M8P5oXBXMU3Y1LMV3YlmGH3',
    email: 's.callhub2811@gmail.com',
    phone: '+919876543210',
    name: 'Test Customer Samyak',
    role: 'customer',
    branchId: 'branch_rjn_main',
    franchiseId: 'fra_rajnandgaon',
    allowedApps: ['CUSTOMER'],
  },

  // 6. POS Cashier
  CASHIER: {
    id: 'cust_9876500001',
    email: 'cashier.rjn@olivepizza.in',
    phone: '+919876500001',
    name: 'Priya Cashier',
    role: 'pos',
    branchId: 'branch_rjn_main',
    franchiseId: 'fra_rajnandgaon',
    allowedApps: ['POS'],
  },
} as const;

export const BRANCH_FIXTURES = {
  MAIN: {
    id: 'branch_rjn_main',
    legacyId: 'main_branch',
    name: 'Olive Pizza Rajnandgaon Main',
    franchiseId: 'fra_rajnandgaon',
    latitude: 21.0974,
    longitude: 81.0347,
    radiusKm: 12,
    baseDeliveryFee: 40,
    freeDeliveryThreshold: 499,
    gstPercentage: 5,
    packagingCharge: 20,
    isOpen: true,
    acceptingOrders: true,
  },
  DURG: {
    id: 'branch_durg_01',
    name: 'Olive Pizza Durg Branch',
    franchiseId: 'fra_durg',
    latitude: 21.1904,
    longitude: 81.2849,
    radiusKm: 10,
    baseDeliveryFee: 45,
    freeDeliveryThreshold: 599,
    gstPercentage: 5,
    packagingCharge: 25,
    isOpen: true,
    acceptingOrders: true,
  },
} as const;

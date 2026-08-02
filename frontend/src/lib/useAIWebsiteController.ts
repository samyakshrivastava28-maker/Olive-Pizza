import { useLocation, useNavigate } from 'react-router';
import { useCartStore, useAuthStore } from './store';
import toast from 'react-hot-toast';

export interface WebsiteContextPayload {
  route: string;
  cart: {
    items: { id: string; name: string; quantity: number; price: number }[];
    total: number;
  };
  role: string;
  isAuthenticated: boolean;
  screenSize: { width: number; height: number };
  language: string;
}

export function useAIWebsiteController() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, total, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
  const { user, role, isAuthenticated } = useAuthStore();

  const getWebsiteContext = (): WebsiteContextPayload => {
    return {
      route: location.pathname,
      cart: {
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        total,
      },
      role: role || 'guest',
      isAuthenticated: !!isAuthenticated,
      screenSize: {
        width: typeof window !== 'undefined' ? window.innerWidth : 1280,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
      },
      language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    };
  };

  const executeAIAction = (action: { type: string; payload?: any }) => {
    if (!action || !action.type) return;

    console.log('[AI Controller] Executing action:', action.type, action.payload);

    switch (action.type) {
      case 'NAVIGATE':
        if (action.payload?.path) {
          navigate(action.payload.path);
          toast.success(`Navigating to ${action.payload.path}`);
        }
        break;

      case 'ADD_TO_CART':
        if (action.payload?.productId) {
          addItem({
            id: action.payload.productId,
            menuItemId: action.payload.productId,
            name: action.payload.productName || 'Pizza',
            price: action.payload.price || 299,
            quantity: action.payload.quantity || 1,
            image: action.payload.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
            size: action.payload.size || 'Medium',
            crust: action.payload.crust || 'Classic',
            addons: [],
          });
          toast.success(`Added ${action.payload.productName || 'item'} to cart! 🍕`);
        }
        break;

      case 'REMOVE_FROM_CART':
        if (action.payload?.productId) {
          removeItem(action.payload.productId);
          toast.success('Item removed from cart.');
        }
        break;

      case 'INCREASE_QTY':
        if (action.payload?.productId) {
          const item = items.find((i) => i.id === action.payload.productId);
          if (item) updateQuantity(item.id, item.quantity + 1);
        }
        break;

      case 'DECREASE_QTY':
        if (action.payload?.productId) {
          const item = items.find((i) => i.id === action.payload.productId);
          if (item && item.quantity > 1) {
            updateQuantity(item.id, item.quantity - 1);
          } else if (item) {
            removeItem(item.id);
          }
        }
        break;

      case 'CLEAR_CART':
        clearCart();
        toast.success('Cart cleared.');
        break;

      case 'APPLY_COUPON':
        if (action.payload?.code) {
          toast.success(`Applied coupon code: ${action.payload.code}! 🎉`);
        }
        break;

      case 'SEARCH_MENU':
        if (action.payload?.query) {
          navigate(`/menu?search=${encodeURIComponent(action.payload.query)}`);
        }
        break;

      case 'OPEN_CATEGORY':
        if (action.payload?.category) {
          navigate(`/menu?category=${encodeURIComponent(action.payload.category)}`);
        }
        break;

      case 'START_CHECKOUT':
        navigate('/checkout');
        break;

      case 'TRACK_ORDER':
        if (action.payload?.orderId) {
          navigate(`/order-tracking/${action.payload.orderId}`);
        } else {
          navigate('/dashboard');
        }
        break;

      default:
        console.warn('[AI Controller] Unhandled action type:', action.type);
    }
  };

  return {
    getWebsiteContext,
    executeAIAction,
  };
}

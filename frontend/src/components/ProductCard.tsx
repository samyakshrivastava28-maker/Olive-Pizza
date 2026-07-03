import { memo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { MenuItem } from '../types/models';
import { Plus } from 'lucide-react';
import WishlistButton from './ui/WishlistButton';

interface ProductCardProps {
  item: MenuItem;
  discount?: number;
  wishlistIds?: string[];
}

export default memo(function ProductCard({ item, discount = 0, wishlistIds = [] }: ProductCardProps) {
  const navigate = useNavigate();
  const appliedDiscount = item.discountPercentage || discount;
  const finalPrice = item.pricingMode === 'offer' && item.offerPrice ? item.offerPrice : 
                     appliedDiscount > 0 ? Math.round(item.basePrice * (1 - appliedDiscount / 100)) : item.basePrice;

  const handleCardClick = () => {
    if (item.isAvailable) {
      navigate(`/product/${item.id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`premium-card w-full flex flex-col relative transition-colors duration-300 ${
        item.isAvailable ? 'cursor-pointer hover:bg-dark-700 active:scale-[0.98]' : 'opacity-60 grayscale cursor-not-allowed'
      }`}
    >
      {appliedDiscount > 0 && item.isAvailable && (
        <div className="absolute top-3 left-3 bg-accent-500 text-dark-950 text-xs font-black px-3 py-1 rounded-full shadow-md z-10">
          {appliedDiscount}% OFF
        </div>
      )}
      
      {/* Large Image Container */}
      <div className="w-full aspect-[4/3] md:aspect-square relative overflow-hidden bg-dark-900 border-b border-dark-700">
        <img 
          src={item.image.includes('cloudinary') ? item.image.replace("/upload/", "/upload/f_auto,q_auto,w_400/") : item.image} 
          alt={item.name} 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
        />
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-dark-900 border border-dark-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider">Out of Stock</span>
          </div>
        )}
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <WishlistButton productId={item.id || ''} wishlistIds={wishlistIds} size="sm" />
        </div>
      </div>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-lg md:text-xl font-bold text-white leading-tight">{item.name}</h3>
          <span className={`shrink-0 px-2 py-0.5 text-[10px] font-black rounded uppercase border ${item.isVegetarian ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'}`}>
            {item.isVegetarian ? 'VEG' : 'NON-VEG'}
          </span>
        </div>
        
        <p className="text-sm text-slate-400 leading-relaxed mb-4 line-clamp-2">{item.description}</p>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            {appliedDiscount > 0 ? (
              <>
                <span className="text-xs text-slate-500 line-through font-medium">₹{item.basePrice}</span>
                <span className="text-xl md:text-2xl font-black text-accent-500 drop-shadow-[0_2px_10px_rgba(249,115,22,0.3)]">
                  ₹{finalPrice}
                </span>
              </>
            ) : (
              <span className="text-xl md:text-2xl font-black text-white">₹{finalPrice}</span>
            )}
          </div>
          
          <button 
            disabled={!item.isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className={`px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-transform active:scale-90 ${
              item.isAvailable 
                ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-md' 
                : 'bg-dark-800 border border-dark-700 text-slate-500'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
});

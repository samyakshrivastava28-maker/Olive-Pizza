import React from 'react';

interface PizzaLoaderProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  className?: string;
  overlayClassName?: string;
}

const PizzaLoader: React.FC<PizzaLoaderProps> = ({ 
  text = 'Preparing something delicious...', 
  size = 'medium',
  fullScreen = false,
  className = '',
  overlayClassName = ''
}) => {
  
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  const loaderContent = (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className={`relative ${sizeClasses[size]} animate-spin`} style={{ animationDuration: '3s' }}>
        {/* SVG Pizza Base */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Crust */}
          <circle cx="50" cy="50" r="48" fill="#e2a159" stroke="#b46d24" strokeWidth="4" />
          
          {/* Cheese */}
          <circle cx="50" cy="50" r="42" fill="#ffd166" />
          
          {/* Slice lines to make it look like slices */}
          <line x1="50" y1="8" x2="50" y2="92" stroke="#e2a159" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="50" x2="92" y2="50" stroke="#e2a159" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="20" x2="80" y2="80" stroke="#e2a159" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="80" x2="80" y2="20" stroke="#e2a159" strokeWidth="2" strokeLinecap="round" />
          
          {/* Pepperoni 1 */}
          <circle cx="35" cy="30" r="6" fill="#ef476f" />
          <circle cx="34" cy="28" r="1.5" fill="#d32f2f" />
          <circle cx="37" cy="31" r="1" fill="#d32f2f" />
          
          {/* Pepperoni 2 */}
          <circle cx="65" cy="40" r="7" fill="#ef476f" />
          <circle cx="63" cy="39" r="2" fill="#d32f2f" />
          
          {/* Pepperoni 3 */}
          <circle cx="45" cy="70" r="5" fill="#ef476f" />
          <circle cx="46" cy="69" r="1" fill="#d32f2f" />
          
          {/* Pepperoni 4 */}
          <circle cx="25" cy="60" r="6.5" fill="#ef476f" />
          
          {/* Pepperoni 5 */}
          <circle cx="75" cy="65" r="5.5" fill="#ef476f" />
          
          {/* Olive 1 */}
          <circle cx="50" cy="45" r="3" fill="#118ab2" />
          <circle cx="50" cy="45" r="1" fill="#ffd166" />
          
          {/* Olive 2 */}
          <circle cx="30" cy="45" r="2.5" fill="#118ab2" />
          <circle cx="30" cy="45" r="1" fill="#ffd166" />
          
          {/* Olive 3 */}
          <circle cx="65" cy="25" r="3" fill="#118ab2" />
          <circle cx="65" cy="25" r="1" fill="#ffd166" />

          {/* Olive 4 */}
          <circle cx="60" cy="75" r="2.5" fill="#118ab2" />
          <circle cx="60" cy="75" r="1" fill="#ffd166" />
          
          {/* Missing Slice Effect (Optional overlay) */}
          <path d="M50 50 L50 0 A 50 50 0 0 1 85.355 14.644 Z" className="animate-pulse" fill="#f8fafc" style={{ fillOpacity: 0.9 }} />
        </svg>
      </div>
      
      {text && (
        <p className="text-primary-600 dark:text-primary-400 font-bold tracking-wide animate-pulse text-lg">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ${overlayClassName}`}>
        {loaderContent}
      </div>
    );
  }

  return (
    <div className={`flex w-full h-full min-h-[200px] items-center justify-center ${overlayClassName}`}>
      {loaderContent}
    </div>
  );
};

export default PizzaLoader;

import React from 'react';

interface Realistic3DPizzaBoxProps {
  size?: number;
  productImage?: string;
  isLidOpen?: boolean;
  className?: string;
}

/**
 * Realistic3DPizzaBox — Isolated Vector 3D Isometric Pizza Delivery Box
 * 
 * Features:
 * - 100% Transparent SVG boundaries (NO rectangular white/black card backgrounds)
 * - True three-quarter isometric perspective with visible top lid, front bevel & side depth planes
 * - Warm terracotta Olive Pizza brand cardboard shading with ambient lighting
 * - Crisp branded graphics: Olive Pizza emblem, "FRESH & HOT", gold seal ring
 * - Soft matching isometric shadow (no square CSS box-shadow artifacts)
 */
export const Realistic3DPizzaBox: React.FC<Realistic3DPizzaBoxProps> = ({
  size = 120,
  productImage,
  className = '',
}) => {
  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        overflow: 'visible',
      }}
    >
      <svg
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Cardboard Top Lid Gradient */}
          <linearGradient id="lidGrad" x1="20" y1="35" x2="180" y2="125" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="45%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* Left/Front Depth Bevel Gradient */}
          <linearGradient id="frontEdgeGrad" x1="20" y1="90" x2="100" y2="155" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>

          {/* Right/Side Depth Bevel Gradient */}
          <linearGradient id="sideEdgeGrad" x1="100" y1="155" x2="180" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9a3412" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>

          {/* Inner Well / Liner Gradient */}
          <linearGradient id="kraftLinerGrad" x1="40" y1="50" x2="160" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Gold Crest Ring */}
          <linearGradient id="goldCrest" x1="80" y1="60" x2="120" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Isometric Contact Shadow Filter */}
          <filter id="boxShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.45 0" />
          </filter>

          {/* Circular Clip for Inner Product Preview */}
          <clipPath id="pizzaCircleClip">
            <ellipse cx="100" cy="80" rx="34" ry="20" />
          </clipPath>
        </defs>

        {/* ── 1. Soft Isometric Bottom Shadow (Hexagonal silhouette, NO square borders) ── */}
        <polygon
          points="100,165 178,122 178,132 100,175 22,132 22,122"
          fill="#000000"
          opacity="0.45"
          filter="url(#boxShadow)"
        />

        {/* ── 2. Front Left Thickness Face (Carton thickness plane) ── */}
        <polygon
          points="20,85 100,130 100,146 20,101"
          fill="url(#frontEdgeGrad)"
        />

        {/* ── 3. Front Right Thickness Face (Carton thickness plane) ── */}
        <polygon
          points="100,130 180,85 180,101 100,146"
          fill="url(#sideEdgeGrad)"
        />

        {/* Carton Front Corner Highlight crease */}
        <line x1="100" y1="130" x2="100" y2="146" stroke="#fb923c" strokeWidth="1.2" opacity="0.6" />
        <line x1="20" y1="85" x2="100" y2="130" stroke="#fed7aa" strokeWidth="1" opacity="0.4" />
        <line x1="100" y1="130" x2="180" y2="85" stroke="#fed7aa" strokeWidth="0.8" opacity="0.25" />

        {/* ── 4. Main 3D Isometric Top Lid Plane ── */}
        <polygon
          points="100,40 180,85 100,130 20,85"
          fill="url(#lidGrad)"
          stroke="#fed7aa"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ── 5. Inner Cardboard Bevel Rim (Subtle realism indentation) ── */}
        <polygon
          points="100,46 172,86 100,124 28,86"
          fill="none"
          stroke="#c2410c"
          strokeWidth="1.5"
          opacity="0.75"
        />

        {/* ── 6. Optional Product / Crust Glimpse (Appears under seal or branding) ── */}
        {productImage && (
          <g clipPath="url(#pizzaCircleClip)" opacity="0.22">
            <image
              href={productImage}
              x="60"
              y="55"
              width="80"
              height="50"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        )}

        {/* ── 7. Branded Olive Pizza Emblem (Centrally positioned in isometric space) ── */}
        {/* Isometric Emblem Outer Gold Ring */}
        <ellipse
          cx="100"
          cy="83"
          rx="32"
          ry="18"
          fill="#7c2d12"
          stroke="url(#goldCrest)"
          strokeWidth="2"
          opacity="0.95"
        />

        {/* Concentric Decorative Inner Ring */}
        <ellipse
          cx="100"
          cy="83"
          rx="27"
          ry="15"
          fill="#431407"
          stroke="#fef08a"
          strokeWidth="0.8"
          strokeDasharray="2 1.5"
          opacity="0.8"
        />

        {/* Brand Pizza Slice / Crown Icon Vector */}
        <path
          d="M 94,84 L 100,74 L 106,84 Z"
          fill="#f59e0b"
          stroke="#fef08a"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="80" r="1.5" fill="#dc2626" />
        <circle cx="97" cy="82.5" r="1" fill="#15803d" />
        <circle cx="103" cy="82.5" r="1" fill="#15803d" />

        {/* Brand Text Curved / Centered */}
        <text
          x="100"
          y="93"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="6.5"
          fontWeight="900"
          letterSpacing="1"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ textTransform: 'uppercase' }}
        >
          OLIVE PIZZA
        </text>

        <text
          x="100"
          y="70"
          textAnchor="middle"
          fill="#fef08a"
          fontSize="4.5"
          fontWeight="700"
          letterSpacing="0.8"
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.9"
        >
          ★ FRESH & HOT ★
        </text>

        {/* ── 8. Front Lid Latch Tab (Physically tucks into box) ── */}
        <polygon
          points="92,130 108,130 105,136 95,136"
          fill="#c2410c"
          stroke="#7c2d12"
          strokeWidth="0.8"
        />
        <line x1="93" y1="130" x2="107" y2="130" stroke="#fef08a" strokeWidth="0.8" opacity="0.7" />

        {/* Steam / Aroma Lines (Subtle golden heat curls) */}
        <path
          d="M 93,60 Q 91,52 94,46"
          stroke="#fef08a"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
        />
        <path
          d="M 100,58 Q 102,49 99,43"
          stroke="#fef08a"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M 107,60 Q 109,52 106,46"
          stroke="#fef08a"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
        />
      </svg>
    </div>
  );
};

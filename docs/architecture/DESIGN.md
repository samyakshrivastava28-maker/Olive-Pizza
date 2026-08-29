---
name: Olive Pizza Premium Dark
colors:
  primary: "#f97316"
  secondary: "#f59e0b"
  surface: "#06070a"
  surface-variant: "#0d0e12"
  on-surface: "#ffffff"
  on-surface-muted: "#94a3b8"
  error: "#ef4444"
  success: "#22c55e"
  accent-gold: "#fbbf24"
  accent-violet: "#8b5cf6"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 900
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 700
rounded:
  sm: 12px
  md: 16px
  lg: 24px
  full: 9999px
---

# Olive Pizza — Design System (Google Stitch Standard)

## Overview
A luxury, high-conversion visual experience builder for **Olive Pizza**.
Built mobile-first with 3D glassmorphism, vibrant pizza brand colors, smooth spring micro-animations, and server-driven layout flexibility.

## Brand Color Palette
- **Primary Orange** (`#f97316`): Main CTAs, Add to Cart buttons, active navigation highlights
- **Secondary Gold** (`#f59e0b`): Festive banners, premium badges, coupon highlights, flash sales
- **Dark Surface** (`#06070a`): Main background canvas, mobile device frame backdrop
- **Surface Variant** (`#0d0e12`): Panel backgrounds, card containers, dialog modals
- **On-Surface** (`#ffffff`): Primary headers, bold titles, crisp white text
- **On-Surface Muted** (`#94a3b8`): Subheadlines, labels, helper descriptions
- **Success Green** (`#22c55e`): Order statuses, verified badges, live online indicators
- **Error Red** (`#ef4444`): Out of stock badges, destructive actions, validation alerts

## Typography Hierarchy
- **Headlines**: Inter, 800–900 black weight, tight letter spacing
- **Body**: Inter, 400 regular & 500 medium (14px–16px)
- **Labels & Chips**: Inter, 700 bold uppercase (10px–12px) with subtle tracking

## Component Standards
- **Buttons**: Rounded-xl (12px–16px), primary uses vibrant orange gradient fill with subtle shadow (`shadow-lg shadow-orange-500/25`)
- **Cards**: Glassmorphic dark containers (`bg-white/[0.03]` border `border-white/[0.08]`), backdrop blur, 24px rounded corners (`rounded-3xl`)
- **Floating Cart**: Live floating pill animation with soft pulse breathing effect and dynamic item counter badge
- **Section Layouts**: Hero, Menu Categories, Coupon Carousel, Ads Banner, Best Sellers Grid, Video Showcase, App Download CTA, FAQ Accordion

## Motion & Micro-Interactions (Framer Motion)
- **Physics**: Smooth spring physics (`stiffness: 300`, `damping: 30`)
- **Add-to-Cart Sequence**: 3D box drop -> Item fly -> Lid close -> Box fly to cart -> Floating cart particle bounce
- **Hover & Touch**: Scale transforms (`whileHover: { scale: 1.02 }`, `whileTap: { scale: 0.98 }`)

## Mobile First Guidelines
- Mobile experience MUST feel like a native application (Capacitor/Android/iOS ready)
- All interactive touch targets MUST have a minimum size of 44x44px
- High-contrast text ratio (minimum 4.5:1) against dark surface

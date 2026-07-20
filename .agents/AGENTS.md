# Global Design Standard

Every UI/UX element in Olive Pizza must automatically follow these rules:

1. **Mobile First Policy (Highest Priority)**
   - EVERY UI/UX design must be created using this priority:
     1. Mobile Website
     2. Android App (Capacitor)
     3. Desktop Website
   - Do NOT design desktop first.
   - The mobile version should feel like a premium native application, not a responsive desktop website.

2. **Premium Aesthetics**
   - Premium native-app experience.
   - Beautiful 3D components and glassmorphism where appropriate.
   - Consistent Olive Pizza branding (using tailwind primary colors).
   - Smooth micro-interactions and accessible touch targets.

3. **Animation Quality**
   - Use modern motion principles (Framer Motion).
   - Animations should use spring physics, smooth easing, and curved motion paths.
   - Layered transforms with natural acceleration and deceleration.
   - GPU-accelerated transforms where possible.
   - Avoid janky or linear animations.

4. **Floating Cart Standard**
   - The Floating Cart should always feel alive.
   - Includes idle floating motion, soft breathing animation, live badge updates.
   - Spring interactions and a premium opening animation.

5. **Premium Add-to-Cart Animation**
   - When "Add to Cart" is clicked, do not use simple fades or instant updates.
   - Use the sequenced 5-step animation (3D box drops -> image flies into box -> lid closes -> box flies to cart -> cart bounces with particles).

/**
 * ProductScene3D.tsx
 * ------------------
 * Three.js-powered rotating disc/plate viewer for the Olive Pizza product detail page.
 *
 * Features:
 *  • Lazy-loaded via React.lazy (never bundled unless the component enters the viewport)
 *  • Rotating textured CylinderGeometry that looks like a pizza on a plate
 *  • Custom GLSL fragment shader with champagne rim/edge glow
 *  • Pointer/touch drag with inertia for manual rotation
 *  • devicePixelRatio capped at 2.0 for performance
 *  • Full cleanup (renderer, textures, geometries, materials) on unmount
 *  • Graceful CSS fallback when WebGL is unavailable or Three.js fails
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductScene3DProps {
  imageUrl: string;
  productName: string;
  /** Width/height of the canvas in CSS pixels (default: 320 mobile, 480 desktop) */
  size?: number;
}

// ─── CSS Fallback (no WebGL) ─────────────────────────────────────────────────

function FallbackTilt({
  imageUrl,
  productName,
  size,
}: ProductScene3DProps & { size: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(x, [-0.5, 0.5], ["-12deg", "12deg"]);

  const handleMove = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      x.set((clientX - rect.left) / rect.width - 0.5);
      y.set((clientY - rect.top) / rect.height - 0.5);
    },
    [x, y]
  );

  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      style={{
        width: size,
        height: size,
        perspective: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={reset}
      onTouchMove={(e) => {
        const t = e.touches[0];
        handleMove(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect());
      }}
      onTouchEnd={reset}
    >
      <motion.img
        src={imageUrl}
        alt={productName}
        style={{
          rotateX,
          rotateY,
          width: "90%",
          height: "90%",
          objectFit: "contain",
          borderRadius: "50%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          transformStyle: "preserve-3d",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </motion.div>
  );
}

// ─── Three.js Scene ───────────────────────────────────────────────────────────

export default function ProductScene3D({
  imageUrl,
  productName,
  size: sizeProp,
}: ProductScene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webGLFailed, setWebGLFailed] = useState(false);

  // Responsive size: default 320 on mobile, 480 on desktop
  const size = sizeProp ?? (window.innerWidth >= 1024 ? 480 : 320);
  // Cap canvas physical pixels
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2.0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // ── Dynamic Three.js import ───────────────────────────────────────────────
    let cancelled = false;
    let cleanupFn: (() => void) | null = null;

    const initThree = async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        if (!cancelled) setWebGLFailed(true);
        return;
      }

      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;

      // ── Renderer ──────────────────────────────────────────────────────────
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
        });
      } catch {
        setWebGLFailed(true);
        return;
      }

      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size);
      renderer.setClearColor(0x000000, 0);

      // ── Scene / Camera ────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0.6, 2.5);
      camera.lookAt(0, 0, 0);

      // ── Texture ───────────────────────────────────────────────────────────
      const textureLoader = new THREE.TextureLoader();
      let texture: import("three").Texture | null = null;
      try {
        texture = await new Promise<import("three").Texture>((resolve, reject) => {
          textureLoader.load(imageUrl, resolve, undefined, reject);
        });
        texture.colorSpace = THREE.SRGBColorSpace;
      } catch {
        // If texture fails, create a solid orange placeholder
        texture = new THREE.Texture();
      }

      if (cancelled) {
        texture?.dispose();
        renderer.dispose();
        return;
      }

      // ── Custom ShaderMaterial with rim/edge champagne glow ────────────────
      const discMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: texture },
          uTime: { value: 0.0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewDir;

          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTexture;
          uniform float uTime;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewDir;

          void main() {
            vec4 texColor = texture2D(uTexture, vUv);

            // Rim/edge glow + subtle refraction
            float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
            vec3 rimColor = vec3(0.83, 0.68, 0.21); // champagne gold
            
            // Animated shimmer pulse on rim
            float pulse = 0.5 + 0.5 * sin(uTime * 1.5);
            vec4 rimGlow = vec4(rimColor, 1.0) * (0.3 + 0.1 * pulse);
            
            gl_FragColor = mix(texColor, rimGlow, rim * 0.4);
            
            // Slight vignette on the top face for depth
            float vignette = 1.0 - smoothstep(0.3, 0.9, length(vUv - 0.5) * 1.6);
            gl_FragColor.rgb *= (0.85 + 0.15 * vignette);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      });

      // Side band (plain dark material so the edge looks like a plate)
      const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.4,
        metalness: 0.6,
      });

      // ── Disc Geometry (CylinderGeometry = disc/plate) ─────────────────────
      // radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded
      const discGeometry = new THREE.CylinderGeometry(1, 1, 0.08, 64, 1, false);

      // CylinderGeometry material groups: 0 = top cap, 1 = bottom cap, 2 = side
      const disc = new THREE.Mesh(discGeometry, [discMaterial, discMaterial, edgeMaterial]);
      disc.rotation.x = -Math.PI * 0.08; // slight forward tilt
      scene.add(disc);

      // ── Ambient + directional lights ──────────────────────────────────────
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
      keyLight.position.set(2, 4, 3);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xd4af37, 0.4);
      rimLight.position.set(-3, 1, -2);
      scene.add(rimLight);

      // ── Drag / Inertia ────────────────────────────────────────────────────
      let isDragging = false;
      let lastPointerX = 0;
      let velocityX = 0;
      let currentRotY = 0;
      const AUTO_SPEED = 0.004; // rad/frame auto-rotation

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true;
        lastPointerX = e.clientX;
        velocityX = 0;
        canvas.setPointerCapture(e.pointerId);
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        const delta = e.clientX - lastPointerX;
        velocityX = delta * 0.012;
        currentRotY += velocityX;
        disc.rotation.y = currentRotY;
        lastPointerX = e.clientX;
      };
      const onPointerUp = () => {
        isDragging = false;
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointerleave", onPointerUp);

      // ── Animation Loop ────────────────────────────────────────────────────
      let rafId: number;
      let startTime = performance.now();

      const animate = () => {
        rafId = requestAnimationFrame(animate);

        const elapsed = (performance.now() - startTime) / 1000;
        (discMaterial.uniforms.uTime as { value: number }).value = elapsed;

        if (!isDragging) {
          // Apply inertia
          velocityX *= 0.94;
          currentRotY += velocityX + AUTO_SPEED;
          disc.rotation.y = currentRotY;
        }

        renderer.render(scene, camera);
      };

      animate();

      // ── Cleanup function ──────────────────────────────────────────────────
      cleanupFn = () => {
        cancelled = true;
        cancelAnimationFrame(rafId);

        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointerleave", onPointerUp);

        // Dispose geometries, materials, textures
        discGeometry.dispose();
        discMaterial.dispose();
        edgeMaterial.dispose();
        texture?.dispose();
        ambient.dispose();
        keyLight.dispose();
        rimLight.dispose();

        renderer.dispose();
        renderer.forceContextLoss();
      };
    };

    initThree().catch(() => {
      if (!cancelled) setWebGLFailed(true);
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
    // imageUrl changing should re-mount the whole effect so texture refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, size, dpr]);

  if (webGLFailed) {
    return <FallbackTilt imageUrl={imageUrl} productName={productName} size={size} />;
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center select-none"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          cursor: "grab",
          touchAction: "none",
        }}
        aria-label={`3D view of ${productName}`}
      />
    </div>
  );
}

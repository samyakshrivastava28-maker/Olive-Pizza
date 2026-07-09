import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center, Sparkles } from "@react-three/drei";
import { motion } from "framer-motion";
import gsap from "gsap";
import confetti from "canvas-confetti";

// A stylized procedural Pizza using Drei primitives
function ProceduralPizza() {
  return (
    <group rotation={[Math.PI / 4, 0, 0]}>
      {/* Pizza Crust */}
      <mesh receiveShadow castShadow position={[0, -0.05, 0]}>
        <cylinderGeometry args={[2, 2, 0.1, 32]} />
        <meshStandardMaterial color="#d4a373" roughness={0.8} />
      </mesh>
      
      {/* Pizza Cheese */}
      <mesh receiveShadow castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[1.85, 1.85, 0.12, 32]} />
        <meshStandardMaterial color="#faedcb" roughness={0.4} />
      </mesh>

      {/* Pepperoni Slices */}
      {[
        [-0.8, 0.5], [0.5, 0.8], [1, -0.2], [-0.4, -1], [0.2, -1.2], [-1.2, -0.4], [0, 0]
      ].map((pos, i) => (
        <mesh key={i} receiveShadow castShadow position={[pos[0], 0.08, pos[1]]}>
          <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
          <meshStandardMaterial color="#c1121f" roughness={0.6} />
        </mesh>
      ))}

      {/* Floating Cheese/Steam Particles */}
      <Sparkles count={50} scale={5} size={6} speed={0.4} color="#faedcb" opacity={0.5} />
    </group>
  );
}

export default function OrderSuccessScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Confetti Burst
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#ffffff', '#faedcb']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#ffffff', '#faedcb']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // GSAP Camera effect (simulated on DOM elements)
    gsap.fromTo(
      ".success-text-container",
      { opacity: 0, y: 50, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: "back.out(1.7)", delay: 0.5 }
    );

    // Auto navigate after 5 seconds
    const timeout = setTimeout(() => {
      // Fade out transition handled by framer-motion exit in App.tsx
      navigate("/dashboard", { replace: true });
    }, 5000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      className="fixed inset-0 z-50 bg-dark-950 flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 h-[60vh]">
        <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <Center>
            <ProceduralPizza />
          </Center>
          <OrbitControls 
            autoRotate 
            autoRotateSpeed={4} 
            enableZoom={false} 
            enablePan={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 3}
          />
          <Environment preset="city" />
        </Canvas>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-t from-dark-950 via-dark-950/90 to-transparent flex flex-col items-center justify-end pb-12 px-6 success-text-container">
        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 1 }}
            className="w-12 h-12 bg-success rounded-full flex items-center justify-center text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black text-white text-center mb-2">Order Placed Successfully</h1>
        <p className="text-primary-400 font-bold text-lg md:text-xl mb-4 text-center">Preparing your order...</p>
        
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 w-full max-w-md shadow-2xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-dark-800">
            <span className="text-slate-400">Order Reference</span>
            <span className="font-bold text-white tracking-wider">{orderId || 'NEW ORDER'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Restaurant</span>
            <span className="font-bold text-white">Olive Pizza</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

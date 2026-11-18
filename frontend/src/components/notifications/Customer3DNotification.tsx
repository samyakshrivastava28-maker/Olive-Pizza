import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Navigation, X, Flame, Bike, CheckCircle2, Clock, PackageCheck, UtensilsCrossed, ChevronRight } from 'lucide-react';

export interface CustomerNotificationData {
  title: string;
  body: string;
  orderId?: string;
  url?: string;
  stage?: string;
  status?: string;
  category?: string;
  type?: string;
  deliveryPartnerName?: string;
  eta?: string;
  etaMinutes?: number;
}

export interface SanitizedNotificationResult {
  title: string;
  body: string;
  iconType: string;
  isDrop: boolean;
  stepIndex: number;
  badgeText: string;
  actionUrl?: string;
}

/**
 * Filter out any internal operational alerts that must never reach the customer,
 * and humanize technical status codes into appetizing, customer-delighting updates.
 */
export function sanitizeAndHumanizeNotification(
  rawTitle: string,
  rawBody: string,
  data?: Record<string, any>
): SanitizedNotificationResult {
  const title = (rawTitle || '').toLowerCase();
  const body = (rawBody || '').toLowerCase();
  const type = ((data?.type as string) || '').toLowerCase();
  const category = ((data?.category as string) || '').toLowerCase();
  const rawStage = ((data?.stage as string) || '').toLowerCase();
  const rawStatus = ((data?.status as string) || '').toLowerCase();
  const stage = (rawStage || rawStatus || '').toLowerCase();
  const stageAndStatus = `${rawStage} ${rawStatus} ${stage}`;
  const targetApp = ((data?.targetApp as string) || '').toLowerCase();

  // Collect all data values and payload strings to catch operational leaks in non-standard keys
  const allDataValues = data ? Object.values(data).map(v => typeof v === 'string' ? v.toLowerCase() : '').join(' ') : '';
  const combinedPayloadText = `${title} ${body} ${type} ${category} ${stage} ${targetApp} ${allDataValues}`;

  // 1. HARD DROP: Any operational, kitchen, rider dispatch, or store management alarms
  const OPERATIONAL_NOISE_PATTERNS = [
    'no_rider_pending_queue',
    'no_rider',
    'rider_shortage',
    'dispatch_failed',
    'kitchen queue',
    'queue backlog',
    'backlog',
    'new_order',
    'restaurant_new_order_alarm',
    'alarm_actionable',
    'owner_orders',
    'monthly_report',
    'rider pending',
    'delivery rider',
    'no rider',
    'no delivery partner',
    'no riders',
    'order alert',
    'kitchen alert',
    'operational',
    'dispatch queue',
    'unassigned rider',
    'waiting for courier',
    'waiting for rider',
    'requires delivery but no riders',
    'auto-retrying',
    'rider_0',
    'rider_1',
    'rider_2',
    'rider_3'
  ];

  const hasOperationalNoise = OPERATIONAL_NOISE_PATTERNS.some(pat => combinedPayloadText.includes(pat)) ||
    /rider_\d+/i.test(combinedPayloadText);

  // Hard drop conditions for internal operational noise leaking via stage, status, title, or body
  const isInternalStage =
    stageAndStatus.includes('dispatch') ||
    stageAndStatus.includes('rider') ||
    stageAndStatus.includes('shortage') ||
    stageAndStatus.includes('failed') ||
    stageAndStatus.includes('error') ||
    stageAndStatus.includes('alarm') ||
    stageAndStatus.includes('retry');

  const isInternalTitleOrBody =
    title.includes('rider') ||
    title.includes('kitchen') ||
    title.includes('courier') ||
    title.includes('shortage') ||
    title.includes('queue') ||
    title.includes('retry') ||
    title.includes('dispatch') ||
    body.includes('rider') ||
    body.includes('shortage') ||
    body.includes('dispatch');

  if (
    hasOperationalNoise ||
    isInternalStage ||
    isInternalTitleOrBody ||
    (targetApp && targetApp !== 'customer') ||
    category === 'alarm_actionable' ||
    category === 'owner_orders' ||
    category === 'report' ||
    category === 'monthly_report'
  ) {
    return { title: '', body: '', iconType: 'none', isDrop: true, stepIndex: 0, badgeText: '' };
  }

  // 2. Humanize customer order status notifications into warm, delightful 3D presentations
  let displayTitle = rawTitle;
  let displayBody = rawBody;
  let iconType = 'pizza';
  let stepIndex = 1;
  let badgeText = 'Artisan Kitchen';

  if (stage.includes('pending') || stage.includes('placed') || title.includes('order placed') || title.includes('received')) {
    displayTitle = '🍕 Artisan Order Received!';
    displayBody = 'Our stone ovens are pre-heating and the pizzaiolo is hand-kneading fresh sourdough dough for your feast.';
    iconType = 'sparkles';
    stepIndex = 1;
    badgeText = 'Order Received';
  } else if (stage.includes('accepted') || stage.includes('confirmed') || title.includes('confirmed')) {
    displayTitle = '👨‍🍳 Master Chef Confirmed!';
    displayBody = 'Your order is accepted! Fresh mozzarella, San Marzano tomatoes, and organic herbs are being hand-crafted.';
    iconType = 'check';
    stepIndex = 2;
    badgeText = 'Chef Confirmed';
  } else if (stage.includes('prep') || stage.includes('cooking') || title.includes('baking') || title.includes('stone oven') || title.includes('oven')) {
    displayTitle = '🔥 Stone-Oven Baking at 450°C';
    displayBody = 'Your pizza is blistering to golden perfection inside our traditional stone oven. Sizzling hot!';
    iconType = 'flame';
    stepIndex = 3;
    badgeText = 'Stone Oven Baking';
  } else if (stage.includes('ready') || stage.includes('packed') || title.includes('packed')) {
    displayTitle = '📦 Freshly Packed & Piping Hot';
    displayBody = 'Carefully sealed in an insulated thermal pack to keep every crust crispy and cheese molten.';
    iconType = 'package';
    stepIndex = 4;
    badgeText = 'Piping Hot & Ready';
  } else if (stage.includes('partner_assigned') || stage.includes('picked_up') || stage.includes('out_for_delivery') || title.includes('out for delivery') || title.includes('on the way')) {
    displayTitle = '🛵 Hot & Fresh On The Way!';
    const riderName = data?.deliveryPartnerName ? ` with ${data.deliveryPartnerName}` : '';
    displayBody = `Speeding towards your doorstep${riderName} in an insulated thermal bag. Get your plates ready!`;
    iconType = 'bike';
    stepIndex = 5;
    badgeText = 'On The Way';
  } else if (stage.includes('delivered') || stage.includes('completed') || title.includes('delivered')) {
    displayTitle = '🎉 Piping Hot Delivery Arrived!';
    displayBody = 'Your wood-fired meal is here! Handcrafted with passion. Buon Appetito & enjoy every slice!';
    iconType = 'celebration';
    stepIndex = 6;
    badgeText = 'Delivered';
  } else if (stage.includes('delay') || title.includes('delay')) {
    displayTitle = '⏳ Crafting Extra Perfection';
    displayBody = 'Giving your artisanal sourdough an extra minute of slow bake for that supreme crunch. Freshly on its way!';
    iconType = 'clock';
    stepIndex = 3;
    badgeText = 'Perfecting Crunch';
  }

  return {
    title: displayTitle,
    body: displayBody,
    iconType,
    isDrop: false,
    stepIndex,
    badgeText,
    actionUrl: data?.orderId ? `/order-tracking/${data.orderId}` : (data?.url || '/')
  };
}

export function Customer3DNotificationCard({
  title,
  body,
  iconType,
  stepIndex = 1,
  badgeText = 'Live Kitchen',
  actionUrl,
  onTrack,
  onDismiss
}: {
  title: string;
  body: string;
  iconType: string;
  stepIndex?: number;
  badgeText?: string;
  actionUrl?: string;
  onTrack: () => void;
  onDismiss: () => void;
}) {
  const render3DIcon = () => {
    switch (iconType) {
      case 'flame':
        return (
          <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-red-500 flex items-center justify-center shadow-xl shadow-orange-500/50 border border-amber-300/40 transform group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
            <Flame className="w-7 h-7 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-300 shadow-sm shadow-amber-500"></span>
            </span>
            {/* 3 floating artisan ember particles */}
            {[
              { id: 0, left: '20%', duration: 1.6, delay: 0 },
              { id: 1, left: '50%', duration: 2.1, delay: 0.4 },
              { id: 2, left: '75%', duration: 1.8, delay: 0.8 },
            ].map((ember) => (
              <motion.span
                key={ember.id}
                animate={{
                  y: [2, -14, -22],
                  x: [0, (ember.id - 1) * 4, (ember.id - 1) * 7],
                  opacity: [0, 0.95, 0],
                  scale: [0.6, 1.2, 0.3],
                }}
                transition={{
                  repeat: Infinity,
                  duration: ember.duration,
                  delay: ember.delay,
                  ease: "easeOut",
                }}
                style={{ left: ember.left }}
                className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none"
              />
            ))}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        );
      case 'bike':
        return (
          <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-500/50 border border-amber-300/40 transform group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
            <Bike className="w-7 h-7 text-white" />
            {/* Animated wind speed puffs with spring bounce */}
            <motion.div 
              animate={{
                x: [-4, 4, -4],
                y: [0, -3, 0],
                scale: [0.85, 1.2, 0.85],
                opacity: [0.5, 1, 0.5]
              }} 
              transition={{
                repeat: Infinity,
                duration: 0.75,
                ease: "easeInOut",
                type: "spring",
                stiffness: 300,
                damping: 15
              }}
              className="absolute -bottom-1 -right-1 text-xs select-none pointer-events-none"
            >
              💨
            </motion.div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        );
      case 'package':
        return (
          <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-600/40 border border-orange-300/40 transform group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
            <PackageCheck className="w-7 h-7 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        );
      case 'check':
        return (
          <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 border border-emerald-300/40 transform group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
            <CheckCircle2 className="w-7 h-7 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        );
      case 'celebration':
        return (
          <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-xl shadow-purple-500/50 border border-pink-300/40 transform group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
            <span className="text-2xl select-none animate-bounce">🎉</span>
            {/* Radial micro-sparkles with delayed rotation */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              {[0, 90, 180, 270].map((deg, i) => (
                <motion.span
                  key={deg}
                  animate={{
                    scale: [0.5, 1.3, 0.5],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    delay: i * 0.35,
                    ease: "easeInOut",
                  }}
                  style={{
                    transform: `rotate(${deg}deg) translateY(-20px)`,
                  }}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                />
              ))}
            </motion.div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        );
      case 'clock':
        return (
          <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/40 border border-blue-300/40 transform group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
            <Clock className="w-7 h-7 text-white animate-spin" style={{ animationDuration: '6s' }} />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        );
      default:
        return (
          <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-600 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/50 border border-orange-300/40 transform group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
            <span className="text-2xl select-none">🍕</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        );
    }
  };

  const steps = [
    { label: 'Placed', idx: 1 },
    { label: 'Cooking', idx: 3 },
    { label: 'Packed', idx: 4 },
    { label: 'On Way', idx: 5 },
    { label: 'Delivered', idx: 6 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.88, rotateX: 18 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, y: -30, scale: 0.92, rotateX: -12 }}
      transition={{ type: "spring", stiffness: 450, damping: 26, mass: 0.85 }}
      style={{ perspective: 1200 }}
      className="w-full max-w-sm sm:max-w-md mx-auto pointer-events-auto"
    >
      <div 
        onClick={onTrack}
        className="relative group overflow-hidden rounded-3xl p-4 sm:p-5 transition-all duration-300 cursor-pointer shadow-2xl"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(30, 41, 59, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
          backdropFilter: 'blur(28px) saturate(200%)',
          border: '1.5px solid rgba(251, 146, 60, 0.38)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(249, 115, 22, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
        }}
      >
        {/* Dynamic Sweeping Ambient Light Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-90 blur-[1px]"
          />
        </div>

        {/* Card Specular Highlight & Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none rounded-3xl" />

        <div className="flex items-start gap-3.5">
          {/* 3D Animated Avatar */}
          <div className="shrink-0 pt-0.5">
            {render3DIcon()}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/35 shadow-sm shadow-orange-500/20">
                <Sparkles className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '4s' }} /> {badgeText}
              </span>
            </div>
            
            <h4 className="text-white font-extrabold text-sm sm:text-base mt-1.5 tracking-tight leading-snug group-hover:text-amber-300 transition-colors">
              {title}
            </h4>
            
            <p className="text-slate-300 text-xs mt-1 leading-relaxed line-clamp-2">
              {body}
            </p>

            {/* Live Progress Track */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                {steps.map((st) => (
                  <span 
                    key={st.idx}
                    className={`transition-colors ${stepIndex >= st.idx ? 'text-amber-400 font-extrabold' : 'text-slate-500'}`}
                  >
                    {st.label}
                  </span>
                ))}
              </div>
              <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(15, (stepIndex / 6) * 100))}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 rounded-full shadow-sm shadow-amber-400"
                />
              </div>
            </div>

            {/* Quick Action Pill */}
            <div className="mt-3.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/35 group-hover:shadow-orange-500/50 group-hover:scale-105 active:scale-95 transition-all">
                <Navigation className="w-3.5 h-3.5 animate-bounce" /> Track Order Live <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Tap to open map</span>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 active:scale-90 transition-all"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

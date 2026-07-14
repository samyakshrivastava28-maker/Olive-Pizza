import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { Download, Smartphone } from "lucide-react";
import { DashboardCardSkeleton } from "../../components/ui/SkeletonLoader";

import StatCard from "../../components/owner/StatCard";

import { useHeartbeat } from '../../hooks/useHeartbeat';
import { useLiveMetrics } from '../../hooks/useLiveMetrics';
import { SystemHealthPanel } from '../../components/owner/SystemHealthPanel';
import SystemDiagnostics from '../../components/owner/SystemDiagnostics';
import LiveOrdersTable from "../../components/owner/LiveOrdersTable";
import ActivityFeed from "../../components/owner/ActivityFeed";
import SystemStatusPanel from "../../components/owner/SystemStatusPanel";
import ApkBuildStatus from "../../components/owner/ApkBuildStatus";
import QuickActions from "../../components/owner/QuickActions";
import { GlassCard } from "../../components/ui/glass/GlassSystem";
import { lazy, Suspense } from 'react';

const DashboardCharts = lazy(() => import("../../components/owner/DashboardCharts"));
const OwnerLiveMap = lazy(() => import("../../components/owner/OwnerLiveMap"));
const BusinessIntelligence = lazy(() => import("../../components/owner/BusinessIntelligence"));


export default function OwnerDashboard() {
  useHeartbeat();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({
    todayRevenue: 0,
    todayOrders: 0,
    monthRevenue: 0,
    monthOrders: 0,
    prevMonthRevenue: 0,
    prevMonthOrders: 0,
    revDiff: 0,
    ordDiff: 0,
    pending: 0,
    preparing: 0,
    outForDelivery: 0,
    completed: 0,
    cancelled: 0,
    activeCustomers: 0,
    totalProducts: 0,
    activeCoupons: 0,
    activeAds: 0,
    customerGrowth: 0,
  });

  const liveMetrics = useLiveMetrics();

  const [chartOrders, setChartOrders] = useState<any[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const prevMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const prevMonthEnd = new Date(
          today.getFullYear(),
          today.getMonth(),
          0,
          23,
          59,
          59,
          999,
        );

        // Aggregation Queries for extreme performance (no doc reads)
        const ordersRef = collection(db, "orders");

        // Today's Aggregations
        const qToday = query(
          ordersRef,
          where("createdAt", ">=", today.toISOString()),
        );
        const aggToday = await getAggregateFromServer(qToday, {
          count: count(),
          revenue: sum("totalAmount"),
        });

        // Month's Aggregations
        const qMonth = query(
          ordersRef,
          where("createdAt", ">=", firstOfMonth.toISOString()),
        );
        const aggMonth = await getAggregateFromServer(qMonth, {
          count: count(),
          revenue: sum("totalAmount"),
        });

        // Previous Month's Aggregations
        const qPrevMonth = query(
          ordersRef,
          where("createdAt", ">=", prevMonthStart.toISOString()),
          where("createdAt", "<=", prevMonthEnd.toISOString()),
        );
        const aggPrevMonth = await getAggregateFromServer(qPrevMonth, {
          count: count(),
          revenue: sum("totalAmount"),
        });

        // Status Counts
        const aggPending = await getAggregateFromServer(
          query(ordersRef, where("status", "==", "pending")),
          { count: count() },
        );
        const aggPreparing = await getAggregateFromServer(
          query(ordersRef, where("status", "==", "preparing")),
          { count: count() },
        );
        const aggOut = await getAggregateFromServer(
          query(ordersRef, where("status", "==", "out_for_delivery")),
          { count: count() },
        );
        const aggCompleted = await getAggregateFromServer(
          query(ordersRef, where("status", "==", "delivered")),
          { count: count() },
        );
        const aggCancelled = await getAggregateFromServer(
          query(ordersRef, where("status", "==", "cancelled")),
          { count: count() },
        );

        // Other Stats
        const aggProducts = await getAggregateFromServer(
          collection(db, "products"),
          { count: count() },
        );
        const aggCoupons = await getAggregateFromServer(
          query(collection(db, "coupons"), where("isActive", "==", true)),
          { count: count() },
        );
        const aggAds = await getAggregateFromServer(
          query(collection(db, "ads"), where("isActive", "==", true)),
          { count: count() },
        );
        const aggCustomers = await getAggregateFromServer(
          query(collection(db, "users"), where("role", "==", "customer")),
          { count: count() },
        );

        // Calculate differences
        const cRev = aggMonth.data().revenue || 0;
        const pRev = aggPrevMonth.data().revenue || 0;
        const revDiff =
          pRev > 0 ? ((cRev - pRev) / pRev) * 100 : cRev > 0 ? 100 : 0;

        const cOrd = aggMonth.data().count || 0;
        const pOrd = aggPrevMonth.data().count || 0;
        const ordDiff =
          pOrd > 0 ? ((cOrd - pOrd) / pOrd) * 100 : cOrd > 0 ? 100 : 0;

        setMetrics({
          todayRevenue: aggToday.data().revenue || 0,
          todayOrders: aggToday.data().count || 0,
          monthRevenue: cRev,
          monthOrders: cOrd,
          prevMonthRevenue: pRev,
          revDiff,
          ordDiff,
          totalProducts: aggProducts.data().count || 0,
          activeCoupons: aggCoupons.data().count || 0,
          activeCustomers: aggCustomers.data().count || 0,
          activeAds: aggAds.data().count || 0,
          customerGrowth: 5.2, // Stub for customer growth % as per spec
        });

        // Fetch recent orders for charts
        const qChart = query(
          ordersRef,
          where("createdAt", ">=", firstOfMonth.toISOString()),
        );
        const chartSnap = await getDocs(qChart);
        setChartOrders(chartSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Fetch delivery partners
        const qPartners = query(
          collection(db, "users"),
          where("role", "==", "delivery_partner")
        );
        const partnersSnap = await getDocs(qPartners);
        setDeliveryPartners(partnersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Dashboard Aggregation Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 pb-12 w-full overflow-hidden px-4 md:px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative z-10 space-y-6 md:space-y-8 pb-12 pt-6 w-full px-4 md:px-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
          Overview
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <a
            href="/owner/reports"
            className="w-full md:w-auto bg-white/10 text-white border border-white/20 hover:bg-white/20 px-4 py-2.5 rounded-full font-bold text-sm transition-all backdrop-blur-md shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
          >
            📑 Quick View Reports
          </a>
        </div>
      </div>

      <ApkBuildStatus />

      {/* 1. Top Section - 6 Premium KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        <StatCard
          title="Live Revenue (Today)"
          value={`₹${liveMetrics.todayRevenue.toFixed(2)}`}
          icon="💰"
          isPositive={metrics.revDiff >= 0}
          trend={`${metrics.revDiff > 0 ? "+" : ""}${metrics.revDiff.toFixed(1)}% vs month`}
          delay={0.1}
          colorTheme="orange"
        />
        <StatCard
          title="Live Orders (Today)"
          value={liveMetrics.todayOrders}
          icon="🛍️"
          isPositive={metrics.ordDiff >= 0}
          trend={`${metrics.ordDiff > 0 ? "+" : ""}${metrics.ordDiff.toFixed(1)}% vs month`}
          delay={0.15}
          colorTheme="blue"
        />
        <StatCard
          title="Online Users"
          value={liveMetrics.partnersOnline + liveMetrics.ownersOnline}
          icon="👥"
          isPositive={true}
          trend="Live Now"
          delay={0.2}
          colorTheme="purple"
        />
        <StatCard
          title="Active Deliveries"
          value={liveMetrics.outForDelivery}
          icon="🛵"
          delay={0.25}
          colorTheme="green"
        />
        <StatCard
          title="Total Products"
          value={metrics.totalProducts}
          icon="🍕"
          delay={0.3}
          colorTheme="gold"
        />
        <StatCard
          title="Growth Rate"
          value={`${metrics.revDiff > 0 ? "+" : ""}${metrics.revDiff.toFixed(1)}%`}
          icon="📈"
          isPositive={metrics.revDiff >= 0}
          delay={0.35}
          colorTheme="red"
        />
      </div>

      {/* System Health & Status Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2">
          <SystemHealthPanel />
        </div>
        <div className="xl:col-span-1">
          <SystemStatusPanel />
        </div>
      </div>
      
      <div className="mt-6">
        <SystemDiagnostics />
      </div>

      {/* 5. Charts */}
      <div className="w-full overflow-hidden">
        <Suspense fallback={<DashboardCardSkeleton />}>
          <DashboardCharts ordersData={chartOrders} productsData={[]} />
        </Suspense>
      </div>

      {/* Business Intelligence & Delivery Performance */}
      <Suspense fallback={<DashboardCardSkeleton />}>
        <BusinessIntelligence ordersData={chartOrders} deliveryPartners={deliveryPartners} />
      </Suspense>

      {/* Live Map */}
      <div className="w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-dark-800">
        <Suspense fallback={<div className="w-full h-full bg-dark-800 animate-pulse" />}>
          <OwnerLiveMap />
        </Suspense>
      </div>

      {/* 6. Live Feed & Control Center */}
      <div className="flex flex-col xl:flex-row gap-6">
        <GlassCard className="w-full xl:w-2/3 overflow-x-auto hide-scrollbar">
          <div className="min-w-[600px] p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
            <LiveOrdersTable />
          </div>
        </GlassCard>
        <div className="w-full xl:w-1/3 flex flex-col gap-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Live Activity & Notifications
            </h2>
            <ActivityFeed />
          </GlassCard>
        </div>
      </div>
      </div>
    </>
  );
}

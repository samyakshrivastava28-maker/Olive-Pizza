import { useAuthStore } from "../../lib/store";

export default function DeliveryPerformance() {
  const { user } = useAuthStore();
  const metrics = user?.metrics || {
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    totalTimeTaken: 0,
    fastestDelivery: 0,
    ratingSum: 0,
    ratingCount: 0,
  };

  const avgTime =
    metrics.successfulDeliveries > 0
      ? Math.round(metrics.totalTimeTaken / metrics.successfulDeliveries)
      : 0;
  const successRate =
    metrics.totalDeliveries > 0
      ? Math.round(
          (metrics.successfulDeliveries / metrics.totalDeliveries) * 100,
        )
      : 100;
  const avgRating =
    metrics.ratingCount > 0
      ? (metrics.ratingSum / metrics.ratingCount).toFixed(1)
      : "5.0";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Performance</h1>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
        <div className="text-5xl font-black text-yellow-400 mb-2">
          ⭐ {avgRating}
        </div>
        <div className="text-slate-500 font-bold">
          Based on {metrics.ratingCount} ratings
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500 font-bold mb-1">
            Total Deliveries
          </div>
          <div className="text-2xl font-black">{metrics.totalDeliveries}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500 font-bold mb-1">
            Success Rate
          </div>
          <div
            className={`text-2xl font-black ${successRate >= 95 ? "text-green-500" : successRate >= 85 ? "text-yellow-500" : "text-red-500"}`}
          >
            {successRate}%
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500 font-bold mb-1">Avg Time</div>
          <div className="text-2xl font-black">{avgTime} min</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500 font-bold mb-1">Fastest</div>
          <div className="text-2xl font-black text-primary-500">
            {metrics.fastestDelivery || "-"} min
          </div>
        </div>
      </div>
    </div>
  );
}

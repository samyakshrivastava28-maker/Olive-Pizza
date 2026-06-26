import { useAuthStore } from "../../lib/store";

export default function DeliveryEarnings() {
  const { user } = useAuthStore();
  const earnings = user?.earnings || {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    pendingPayout: 0,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Earnings</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-2xl border border-primary-100 dark:border-primary-800">
          <div className="text-sm text-primary-600 dark:text-primary-400 font-bold mb-1">
            Today
          </div>
          <div className="text-2xl font-black text-primary-700 dark:text-primary-300">
            ₹{earnings.today}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500 font-bold mb-1">This Week</div>
          <div className="text-2xl font-black">₹{earnings.thisWeek}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500 font-bold mb-1">
            This Month
          </div>
          <div className="text-2xl font-black">₹{earnings.thisMonth}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500 font-bold mb-1">
            Pending Payout
          </div>
          <div className="text-2xl font-black text-yellow-600">
            ₹{earnings.pendingPayout}
          </div>
        </div>
      </div>
      <div className="bg-slate-800 text-white p-6 rounded-2xl mt-4">
        <h3 className="font-bold mb-2">Lifetime Earnings</h3>
        <div className="text-4xl font-black text-green-400">
          ₹{earnings.total}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { FileText, ExternalLink, RefreshCw, Mail, Search, HardDrive, CheckCircle2, AlertTriangle, Cpu, TrendingUp, Layers, Activity, Calendar, Zap, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";

interface WeeklyReport {
  id: string;
  docId?: string;
  weekNumber: number;
  year: number;
  weekLabel: string;
  dateRange: string;
  generatedAt: string;
  pdfUrl?: string;
  driveFileId?: string;
  totalRevenue: number;
  netRevenue?: number;
  totalOrders: number;
  completedOrders?: number;
  cancelledOrders?: number;
  averageOrderValue?: number;
  bestSellingItems?: string[];
  emailed?: boolean;
  emailSentAt?: string;
  aiInsights?: {
    peakOrderingHours: string;
    busyDays: string;
    lowPerformingDays: string;
    revenueTrend: string;
    customerGrowth: string;
    recommendations: string[];
  };
}

interface DiagnosticsData {
  pdfGenerator: { status: string; format: string };
  googleDrive: {
    connected: boolean;
    user?: string;
    metrics?: { totalUploads: number; successfulUploads: number; failedUploads: number; lastUploadAt: string };
    error?: string;
  };
  emailQueue: {
    statusBreakdown: { status: string; count: string }[];
    smtpHost: string;
    recipient: string;
  };
  reportsSummary: { totalGenerated: number };
  recentFailures: any[];
}

export default function OwnerReports() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"reports" | "ai_insights" | "diagnostics">("reports");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "reports"), orderBy("generatedAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as WeeklyReport);
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch weekly reports", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/reports/diagnostics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data);
      }
    } catch (err) {
      console.error("Failed to fetch diagnostics", err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchDiagnostics();
  }, []);

  const handleGenerateWeeklyReport = async (targetDateIso?: string) => {
    setGenerating(true);
    const toastId = toast.loading("Queuing weekly report generation task...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetDateIso }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`${data.weekLabel} report task queued in background!`, { id: toastId });
        setTimeout(() => {
          fetchReports();
          fetchDiagnostics();
        }, 3500);
      } else {
        throw new Error(data.error || "Failed to generate report");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger report generation", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailAgain = async (docId: string) => {
    const toastId = toast.loading("Resending weekly report email...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/reports/email-again", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ docId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        fetchReports();
      } else {
        throw new Error(data.error || "Failed to resend email");
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this weekly report record from Firestore?")) return;
    try {
      await deleteDoc(doc(db, "reports", id));
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Report record deleted.");
    } catch (err) {
      toast.error("Failed to delete report.");
    }
  };

  const filteredReports = reports.filter((r) => {
    const label = r.weekLabel || `Week ${r.weekNumber}`;
    const matchesSearch = label.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "all" || r.year?.toString() === selectedYear;
    const matchesWeek = selectedWeek === "all" || r.weekNumber?.toString() === selectedWeek;
    return matchesSearch && matchesYear && matchesWeek;
  });

  const totalTrackedRevenue = reports.reduce((acc, r) => acc + (r.totalRevenue || 0), 0);
  const totalTrackedOrders = reports.reduce((acc, r) => acc + (r.totalOrders || 0), 0);
  const availableYears = Array.from(new Set(reports.map((r) => r.year).filter(Boolean)));
  const availableWeeks = Array.from(new Set(reports.map((r) => r.weekNumber).filter(Boolean))).sort((a, b) => b - a);

  const latestReport = reports[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
              <FileText className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Weekly Business Reports</h1>
              <p className="text-slate-400 text-sm">
                Automated weekly PDF intelligence, AI sales insights, and Google Drive backups.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGenerateWeeklyReport()}
            disabled={generating}
            className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Queuing..." : "Generate Weekly Report"}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Revenue</p>
            <p className="text-2xl font-black text-white">₹{totalTrackedRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracked Orders</p>
            <p className="text-2xl font-black text-white">{totalTrackedOrders.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Google Drive</p>
            <p className={`text-sm font-bold flex items-center gap-1 ${diagnostics?.googleDrive.connected ? "text-green-400" : "text-amber-400"}`}>
              {diagnostics?.googleDrive.connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {diagnostics?.googleDrive.connected ? "Connected" : "Offline Mode"}
            </p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Delivery</p>
            <p className="text-sm font-bold text-slate-200 truncate max-w-[150px]">olivepizzarjn@gmail.com</p>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "reports" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" /> Weekly Reports ({filteredReports.length})
        </button>

        <button
          onClick={() => setActiveTab("ai_insights")}
          className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "ai_insights" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" /> AI Business Insights
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "diagnostics" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" /> Production Diagnostics
        </button>
      </div>

      {/* TAB 1: REPORTS LIST */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search week or year..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="all">All Weeks</option>
                {availableWeeks.map((wk) => (
                  <option key={wk} value={wk}>
                    Week {wk}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="all">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              <button onClick={fetchReports} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-16 text-center text-slate-400 font-bold animate-pulse flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                Loading weekly reports...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400 font-medium">No weekly reports found matching your criteria.</p>
                <button
                  onClick={() => handleGenerateWeeklyReport()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm"
                >
                  Generate First Weekly Report
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Week Period</th>
                      <th className="p-4">Revenue</th>
                      <th className="p-4">Orders</th>
                      <th className="p-4">Generated At</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white text-base">
                            {report.weekLabel || `Week ${report.weekNumber}, ${report.year}`}
                          </div>
                          <div className="text-xs text-slate-400">{report.dateRange}</div>
                        </td>
                        <td className="p-4 font-black text-green-400">
                          ₹{(report.totalRevenue || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 font-bold text-slate-200">
                          {report.totalOrders || 0}
                          {report.completedOrders ? ` (${report.completedOrders} completed)` : ""}
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(report.generatedAt).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4">
                          {report.emailed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Emailed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                              Pending Email
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {report.pdfUrl ? (
                              <a
                                href={report.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Drive Link
                              </a>
                            ) : null}

                            <button
                              onClick={() => handleEmailAgain(report.id)}
                              className="px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <Mail className="w-3.5 h-3.5" /> Resend
                            </button>

                            <button
                              onClick={() => handleGenerateWeeklyReport(report.generatedAt)}
                              className="px-3 py-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Rebuild
                            </button>

                            <button
                              onClick={() => handleDelete(report.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI BUSINESS INSIGHTS */}
      {activeTab === "ai_insights" && (
        <div className="space-y-6">
          {latestReport?.aiInsights ? (
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div className="flex items-center gap-3">
                <Zap className="w-7 h-7 text-amber-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">AI Executive Business Insights</h2>
                  <p className="text-slate-400 text-sm">Synthesized for {latestReport.weekLabel} ({latestReport.dateRange})</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase">Peak Hours</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">{latestReport.aiInsights.peakOrderingHours}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase">Busy Days</p>
                  <p className="text-lg font-bold text-green-400 mt-1">{latestReport.aiInsights.busyDays}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase">Low Performing Days</p>
                  <p className="text-lg font-bold text-red-400 mt-1">{latestReport.aiInsights.lowPerformingDays}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-orange-400" /> Strategic Recommendations
                </h3>
                <div className="space-y-2">
                  {latestReport.aiInsights.recommendations?.map((rec, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 text-sm text-slate-300 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-400 font-bold flex items-center justify-center shrink-0 text-xs">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800">
              No AI insights available yet. Generate a weekly report to view insights.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCTION DIAGNOSTICS */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-500" /> Pipeline Diagnostics & Infrastructure Health
            </h2>
            <button onClick={fetchDiagnostics} className="p-2 bg-slate-900 text-slate-300 rounded-xl hover:text-white">
              <RefreshCw className={`w-4 h-4 ${loadingDiagnostics ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF & Drive Status Card */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-bold text-white">PDF Engine & Google Drive Service</h3>
              </div>

              <div className="space-y-2 text-sm text-slate-300 font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">PDF Generator:</span>
                  <span className="text-green-400 font-bold">{diagnostics?.pdfGenerator?.status || "Healthy"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Layout Format:</span>
                  <span className="text-slate-200">{diagnostics?.pdfGenerator?.format}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Google Drive Account:</span>
                  <span className="text-blue-400 font-bold">{diagnostics?.googleDrive?.user || "Configured"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Uploads Processed:</span>
                  <span className="text-white font-bold">{diagnostics?.googleDrive?.metrics?.successfulUploads || 0}</span>
                </div>
              </div>
            </div>

            {/* Email Queue Status Card */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-blue-500" />
                <h3 className="text-lg font-bold text-white">PostgreSQL Email Queue</h3>
              </div>

              <div className="space-y-2 text-sm text-slate-300 font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">SMTP Host:</span>
                  <span className="text-slate-200">{diagnostics?.emailQueue?.smtpHost}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Report Recipient:</span>
                  <span className="text-purple-400 font-bold">{diagnostics?.emailQueue?.recipient}</span>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Queue Breakdown:</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {diagnostics?.emailQueue?.statusBreakdown?.map((b) => (
                      <div key={b.status} className="bg-slate-950 p-2 rounded-xl text-center border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">{b.status}</span>
                        <span className="text-sm font-bold text-white">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

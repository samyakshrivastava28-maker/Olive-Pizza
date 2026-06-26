import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface MonthlyReport {
  id: string;
  reportId: string;
  month: number;
  year: number;
  generatedAt: string;
  pdfUrl: string;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalDeliveries: number;
  topSellingProducts: string[];
  generatedBySystem?: boolean;
}

export default function OwnerReports() {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "monthly_reports"),
        orderBy("generatedAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MonthlyReport,
      );
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this report record? Note: This does not delete the PDF from Cloudinary.",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "monthly_reports", id));
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete report", err);
      alert("Failed to delete report.");
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.month?.toString().includes(searchTerm) ||
      r.year?.toString().includes(searchTerm),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Monthly Reports</h1>
          <p className="text-slate-400">
            Access and download your historical month-end business reports.
          </p>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search month or year..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#1E293B] dark:bg-slate-800 border border-white/10 rounded-lg px-4 py-2"
          />
        </div>
      </div>

      <div className="bg-[#1E293B] dark:bg-slate-800 rounded-2xl shadow-sm border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
            Loading reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            No reports generated yet. Reports are generated automatically at the
            end of each month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-[#0B0F14] border border-white/5/50 border-b border-white/10">
                  <th className="p-4 font-bold text-slate-400">Period</th>
                  <th className="p-4 font-bold text-slate-400">Revenue</th>
                  <th className="p-4 font-bold text-slate-400">Orders</th>
                  <th className="p-4 font-bold text-slate-400">Generated On</th>
                  <th className="p-4 font-bold text-slate-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const monthName = new Date(
                    report.year,
                    report.month - 1,
                  ).toLocaleString("default", { month: "long" });
                  return (
                    <tr
                      key={report.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-lg">
                          {monthName} {report.year}
                        </div>
                        {report.generatedBySystem && (
                          <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                            Auto-Generated
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-black text-green-600">
                        ₹{report.totalRevenue?.toLocaleString() || 0}
                      </td>
                      <td className="p-4 font-bold text-slate-200">
                        {report.totalOrders || 0}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {new Date(report.generatedAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={report.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap"
                          >
                            View PDF
                          </a>
                          <a
                            href={report.pdfUrl}
                            download={`Report_${monthName}_${report.year}.pdf`}
                            className="bg-slate-100 text-slate-300 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap"
                          >
                            Download
                          </a>
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

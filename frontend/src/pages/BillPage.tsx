import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import PizzaLoader from '../components/ui/PizzaLoader';
import SEO from '../components/SEO';
import { 
  Printer, ArrowLeft, ShieldAlert, CheckCircle2, Clock, 
  MapPin, Phone, Receipt, AlertTriangle, Home 
} from 'lucide-react';

interface BillItem {
  name: string;
  quantity: number;
  size?: string;
  crust?: string;
  addons?: string[];
  price: number;
  addonPrice?: number;
  subtotal: number;
}

interface BillData {
  billReference: string;
  orderId: string;
  permanentBillNo: number;
  billNumber: string;
  dailyOrderNumber: number;
  orderNumber: string;
  orderDate: string;
  orderTime: string;
  orderType: string;
  fulfillmentType: string;
  orderSource: string;
  status: string;
  restaurant: {
    name: string;
    branchName: string;
    address: string;
    phone: string;
    gstin: string;
    fssai: string;
  };
  customer: {
    name: string;
    phone: string;
    deliveryAddress: string;
    pickupInfo?: {
      branchName: string;
      pickupCounter: string;
      address: string;
      contactPhone: string;
    } | null;
  };
  items: BillItem[];
  pricing: {
    subtotal: number;
    discount: number;
    couponCode?: string | null;
    packagingCharge: number;
    deliveryFee: number;
    taxes: number;
    cgst: number;
    sgst: number;
    total: number;
  };
  payment: {
    method: string;
    status: string;
    paymentId?: string | null;
  };
  timing: {
    createdAt: string;
    acceptedAt?: string | null;
    deliveredAt?: string | null;
    cancelledAt?: string | null;
  };
}

export default function BillPage() {
  const { billReference } = useParams<{ billReference: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      // Redirect to login preserving destination
      navigate(`/login?redirect=/bill/${billReference}`, { replace: true });
      return;
    }

    const fetchBill = async () => {
      try {
        setLoading(true);
        setErrorStatus(null);
        setErrorMessage('');

        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          setErrorStatus(401);
          setErrorMessage('Session expired. Please sign in again.');
          return;
        }

        const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/orders/bill/${billReference}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.status === 403) {
          setErrorStatus(403);
          const data = await res.json().catch(() => ({}));
          setErrorMessage(data.error || 'Access Denied: You do not have permission to view this bill.');
          return;
        }

        if (res.status === 404) {
          setErrorStatus(404);
          setErrorMessage('Bill not found. The bill reference may be invalid.');
          return;
        }

        if (!res.ok) {
          setErrorStatus(res.status);
          const data = await res.json().catch(() => ({}));
          setErrorMessage(data.error || 'Unable to load bill details.');
          return;
        }

        const data = await res.json();
        setBill(data.bill);
      } catch (err: any) {
        console.error('Failed to fetch customer bill:', err);
        setErrorStatus(500);
        setErrorMessage(err.message || 'Network error fetching bill.');
      } finally {
        setLoading(false);
      }
    };

    if (billReference) {
      fetchBill();
    }
  }, [billReference, isAuthenticated, isAuthLoading, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <PizzaLoader />
        <p className="text-slate-400 text-sm mt-4 font-medium animate-pulse">Loading Official Bill...</p>
      </div>
    );
  }

  // 403 Forbidden Access Restricted View
  if (errorStatus === 403) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <SEO title="Access Restricted | Olive Pizza" description="Bill Access Restricted" />
        <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">ACCESS FORBIDDEN</h2>
          <div className="inline-block px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-4">
            HTTP 403 · OWNERSHIP VIOLATION
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            {errorMessage}
          </p>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 mb-6 text-left space-y-1">
            <p className="font-semibold text-slate-300">Security Safeguard Active:</p>
            <p>Every customer bill is permanently encrypted and tied to its authenticated purchaser. Attempting to view another account's invoice is strictly prohibited.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
            >
              Go Back
            </button>
            <Link
              to="/dashboard"
              className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all text-center"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 404 / 500 Generic Error View
  if (errorStatus || !bill) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <SEO title="Bill Error | Olive Pizza" description="Bill Unavailable" />
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Bill Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMessage || 'The requested order bill could not be retrieved.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm transition-all"
          >
            Return to Order History
          </button>
        </div>
      </div>
    );
  }

  const isPaid = bill.payment.status === 'PAID';

  return (
    <>
      <SEO title={`Bill ${bill.billNumber} | Olive Pizza`} description={`Official Customer Tax Invoice for ${bill.billNumber}`} />

      {/* Embedded Print CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, footer, nav, .no-print, [data-announcement-bar] {
            display: none !important;
          }
          .bill-print-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            color: #000000 !important;
          }
          .bill-card {
            border: 1px solid #000000 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 12mm 15mm !important;
            border-radius: 0 !important;
          }
          .print-dark-text {
            color: #000000 !important;
          }
          .print-muted-text {
            color: #333333 !important;
          }
          .print-border {
            border-color: #999999 !important;
          }
          .print-bg-light {
            background-color: #f4f4f4 !important;
          }
        }
      `}} />

      <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 bill-print-container flex flex-col items-center">
        {/* Screen Action Bar (Hidden on print) */}
        <div className="w-full max-w-2xl mb-6 flex items-center justify-between no-print">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Receipt size={15} /> All Orders
            </Link>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-xs font-black text-slate-950 bg-primary-400 hover:bg-primary-300 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer size={16} /> PRINT BILL
            </button>
          </div>
        </div>

        {/* ── Official Printable Bill Card ── */}
        <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200 bill-card">
          
          {/* Header Banner */}
          <div className="text-center pb-6 border-b-2 border-dashed border-slate-300 print-border">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">
              {bill.restaurant.name}
            </h1>
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mt-1">
              {bill.restaurant.branchName}
            </p>
            <p className="text-xs text-slate-600 print-muted-text mt-1 max-w-md mx-auto">
              {bill.restaurant.address}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono mt-2">
              <span>GSTIN: <strong className="text-slate-800 print-dark-text">{bill.restaurant.gstin}</strong></span>
              <span>·</span>
              <span>FSSAI: <strong className="text-slate-800 print-dark-text">{bill.restaurant.fssai}</strong></span>
              <span>·</span>
              <span>Ph: <strong className="text-slate-800 print-dark-text">{bill.restaurant.phone}</strong></span>
            </div>
          </div>

          {/* Bill Numbers & Date/Time Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5 border-b border-slate-200 print-border bg-slate-50/80 print-bg-light rounded-2xl p-4 my-6">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Permanent Bill No.
              </span>
              <span className="text-base font-black text-primary-600 print-dark-text">
                {bill.billNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Daily Order No.
              </span>
              <span className="text-base font-black text-slate-900 print-dark-text">
                {bill.orderNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Date & Time
              </span>
              <span className="text-xs font-bold text-slate-800 print-dark-text">
                {bill.orderDate} {bill.orderTime}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Order Type
              </span>
              <span className="text-xs font-bold text-slate-800 print-dark-text">
                {bill.orderType}
              </span>
            </div>
          </div>

          {/* Customer & Fulfillment Info */}
          <div className="mb-6 p-4 rounded-xl border border-slate-200 print-border bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Billed To</span>
                <p className="text-sm font-bold text-slate-900">{bill.customer.name}</p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">{bill.customer.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Order Status</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase mt-1 bg-slate-100 text-slate-800 print-border border">
                  {bill.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {bill.customer.deliveryAddress && (
              <div className="pt-2 border-t border-slate-100 print-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Destination / Address</span>
                <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{bill.customer.deliveryAddress}</p>
              </div>
            )}

            {bill.customer.pickupInfo && (
              <div className="pt-2 border-t border-slate-100 print-border text-xs text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pickup Instructions</span>
                <p className="font-semibold text-slate-900 mt-0.5">{bill.customer.pickupInfo.pickupCounter}</p>
                <p className="text-slate-600 text-[11px]">{bill.customer.pickupInfo.address}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 print-border text-[11px] font-black uppercase text-slate-900">
                  <th className="py-2.5 w-8">#</th>
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5 text-center w-14">Qty</th>
                  <th className="py-2.5 text-right w-20">Rate (₹)</th>
                  <th className="py-2.5 text-right w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print-border text-xs">
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 pr-2">
                      <p className="font-bold text-slate-900 text-sm leading-snug">{item.name}</p>
                      {(item.size || item.crust) && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {[item.size, item.crust].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-[10px] text-primary-700 print-muted-text mt-0.5">
                          + Add-ons: {item.addons.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-3 text-right font-mono text-slate-700">{item.price}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-950">{item.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Calculation Breakdown */}
          <div className="border-t-2 border-slate-200 print-border pt-4 mb-6">
            <div className="w-full max-w-xs ml-auto space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal (Gross Items)</span>
                <span className="font-mono text-slate-800">₹{bill.pricing.subtotal.toFixed(2)}</span>
              </div>
              
              {bill.pricing.discount > 0 && (
                <div className="flex justify-between text-emerald-600 print-dark-text font-medium">
                  <span>
                    Discount {bill.pricing.couponCode ? `(${bill.pricing.couponCode})` : ''}
                  </span>
                  <span className="font-mono">-₹{bill.pricing.discount.toFixed(2)}</span>
                </div>
              )}

              {bill.pricing.packagingCharge > 0 && (
                <div className="flex justify-between">
                  <span>Packaging Charges</span>
                  <span className="font-mono text-slate-800">₹{bill.pricing.packagingCharge.toFixed(2)}</span>
                </div>
              )}

              {bill.pricing.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-mono text-slate-800">₹{bill.pricing.deliveryFee.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-[11px] text-slate-500">
                <span>CGST (2.5%)</span>
                <span className="font-mono text-slate-700">₹{bill.pricing.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>SGST (2.5%)</span>
                <span className="font-mono text-slate-700">₹{bill.pricing.sgst.toFixed(2)}</span>
              </div>

              {/* Final Total */}
              <div className="flex justify-between items-center pt-2.5 mt-2 border-t-2 border-slate-900 print-border text-slate-950">
                <span className="text-sm font-black uppercase">Final Total</span>
                <span className="text-xl font-black font-mono">₹{bill.pricing.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment & Audit Section */}
          <div className="p-4 rounded-2xl bg-slate-50 print-bg-light border border-slate-200 print-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-6">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method</span>
              <p className="font-bold text-slate-900">{bill.payment.method}</p>
              {bill.payment.paymentId && (
                <p className="text-[10px] text-slate-500 font-mono">Ref: {bill.payment.paymentId}</p>
              )}
            </div>
            
            <div className="text-right sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Status</span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase mt-0.5 ${
                isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {bill.payment.status}
              </span>
            </div>
          </div>

          {/* Footer Terms & Appreciation */}
          <div className="text-center pt-4 border-t border-dashed border-slate-300 print-border text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-800">Thank you for dining with Olive Pizza!</p>
            <p>This is a computer-generated authorized invoice. Retain this permanent bill for all warranty, service, and feedback inquiries.</p>
            <p className="text-[10px] font-mono text-slate-400 mt-2">Ref: {bill.billReference}</p>
          </div>

        </div>

        {/* Quick Return Link (Hidden on print) */}
        <div className="mt-8 no-print">
          <Link
            to="/dashboard"
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Home size={14} /> Back to Customer Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}

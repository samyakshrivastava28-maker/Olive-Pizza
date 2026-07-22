import PDFDocument from 'pdfkit';

export interface MonthlyReportMetrics {
  month: string;              // e.g., "July 2026"
  year: number;               // 2026
  monthNumber: number;        // 7
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  failedOrders: number;
  
  // Financials
  totalRevenue: number;
  taxes: number;
  discounts: number;
  netRevenue: number;
  averageOrderValue: number;
  paymentBreakdown: {
    cod: { amount: number; count: number; percent: number };
    upi: { amount: number; count: number; percent: number };
    card: { amount: number; count: number; percent: number };
  };

  // Coupons
  couponsUsed: { code: string; count: number; discountTotal: number }[];

  // Delivery & Prep Operations
  avgDeliveryTimeMinutes: number;
  avgPreparationTimeMinutes: number;
  onTimeDeliveryRate: number;
  activeDeliveryPartners: number;
  deliveryPartnerStats: { name: string; completedCount: number; rating: number }[];

  // Products
  topSellingProducts: { name: string; quantity: number; revenue: number }[];
  worstSellingProducts: { name: string; quantity: number; revenue: number }[];

  // Customers
  newCustomers: number;
  returningCustomers: number;
  totalActiveCustomers: number;

  // Reviews
  totalReviews: number;
  averageRating: number;

  // System & Communications Infrastructure
  notificationsSent: number;
  emailsSent: number;
  emailSuccessRate: number;

  // Trends
  dailySales: { date: string; revenue: number; orders: number }[];
  weeklySales: { week: string; revenue: number; orders: number }[];
  peakHours: { hour: string; count: number }[];
}

export class PdfGenerator {
  
  public async generateReport(metrics: MonthlyReportMetrics): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const primaryColor = '#f97316'; // Olive Pizza Orange
        const darkColor = '#1e293b';    // Dark Slate
        const greenColor = '#16a34a';   // Success Green
        const mutedColor = '#64748b';   // Muted Slate

        // ── PAGE 1: EXECUTIVE & FINANCIAL SUMMARY ────────────────────────────
        
        // Header Banner
        doc.rect(0, 0, 595.28, 80).fill(darkColor);
        
        // Logo / Title Text
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('OLIVE PIZZA', 40, 22);
        doc.fontSize(12).font('Helvetica').fillColor('#f97316').text('MONTHLY BUSINESS & OPERATIONS REPORT', 40, 48);

        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text(metrics.month, 430, 25, { align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 430, 45, { align: 'right' });

        doc.y = 100;

        // Executive Summary Title
        doc.fillColor(darkColor).fontSize(14).font('Helvetica-Bold').text('Executive Financial Summary');
        doc.strokeColor(primaryColor).lineWidth(2).moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();
        doc.moveDown(1.2);

        // Financial Metrics Cards (3-column grid)
        const cardY = doc.y;
        this.drawMetricCard(doc, 40, cardY, 160, 65, 'Total Revenue', `₹${metrics.totalRevenue.toLocaleString('en-IN')}`, greenColor);
        this.drawMetricCard(doc, 215, cardY, 160, 65, 'Total Orders', `${metrics.totalOrders}`, primaryColor);
        this.drawMetricCard(doc, 390, cardY, 165, 65, 'Avg Order Value', `₹${Math.round(metrics.averageOrderValue)}`, darkColor);

        doc.y = cardY + 80;
        const cardY2 = doc.y;
        this.drawMetricCard(doc, 40, cardY2, 160, 65, 'Completed Orders', `${metrics.completedOrders}`, greenColor);
        this.drawMetricCard(doc, 215, cardY2, 160, 65, 'Cancelled / Failed', `${metrics.cancelledOrders + metrics.failedOrders}`, '#dc2626');
        this.drawMetricCard(doc, 390, cardY2, 165, 65, 'Net Taxes & Discounts', `₹${metrics.taxes} / ₹${metrics.discounts}`, mutedColor);

        doc.y = cardY2 + 90;

        // Payment Method Breakdown
        doc.fillColor(darkColor).fontSize(13).font('Helvetica-Bold').text('Payment Method Distribution');
        doc.moveDown(0.5);

        const pmY = doc.y;
        this.drawProgressBar(doc, 40, pmY, 515, 18, [
          { label: 'UPI', percent: metrics.paymentBreakdown.upi.percent, color: '#8b5cf6' },
          { label: 'Card', percent: metrics.paymentBreakdown.card.percent, color: '#3b82f6' },
          { label: 'Cash (COD)', percent: metrics.paymentBreakdown.cod.percent, color: '#10b981' },
        ]);

        doc.y = pmY + 30;
        doc.fontSize(9).font('Helvetica').fillColor(mutedColor);
        doc.text(`UPI: ₹${metrics.paymentBreakdown.upi.amount.toLocaleString()} (${metrics.paymentBreakdown.upi.percent}%)  |  Card: ₹${metrics.paymentBreakdown.card.amount.toLocaleString()} (${metrics.paymentBreakdown.card.percent}%)  |  Cash: ₹${metrics.paymentBreakdown.cod.amount.toLocaleString()} (${metrics.paymentBreakdown.cod.percent}%)`, 40, doc.y);

        doc.moveDown(2);

        // Operations & Delivery Metrics
        doc.fillColor(darkColor).fontSize(13).font('Helvetica-Bold').text('Kitchen & Delivery Performance');
        doc.strokeColor(primaryColor).lineWidth(1).moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();
        doc.moveDown(1);

        const opsY = doc.y;
        this.drawMetricCard(doc, 40, opsY, 160, 55, 'Avg Prep Time', `${metrics.avgPreparationTimeMinutes} mins`, darkColor);
        this.drawMetricCard(doc, 215, opsY, 160, 55, 'Avg Delivery Time', `${metrics.avgDeliveryTimeMinutes} mins`, darkColor);
        this.drawMetricCard(doc, 390, opsY, 165, 55, 'On-Time Delivery', `${metrics.onTimeDeliveryRate}%`, greenColor);

        doc.moveDown(5);

        // Footer Page 1
        this.drawFooter(doc, 1, 4);

        // ── PAGE 2: SALES TRENDS & PEAK HOURS ─────────────────────────────────
        doc.addPage();
        
        doc.fillColor(darkColor).fontSize(16).font('Helvetica-Bold').text('Sales & Order Volume Trends');
        doc.strokeColor(primaryColor).lineWidth(2).moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();
        doc.moveDown(1.5);

        // Daily Sales Table / Bar visualization
        doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('Daily Performance Summary');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(mutedColor);
        doc.text('Date', 50, tableTop);
        doc.text('Orders', 180, tableTop);
        doc.text('Revenue', 300, tableTop);
        doc.text('Volume Bar', 400, tableTop);

        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, tableTop + 14).lineTo(555, tableTop + 14).stroke();

        let rowY = tableTop + 22;
        const maxDailyRev = Math.max(...metrics.dailySales.map(d => d.revenue), 1);

        metrics.dailySales.slice(0, 12).forEach((d) => {
          doc.fontSize(8.5).font('Helvetica').fillColor(darkColor);
          doc.text(d.date, 50, rowY);
          doc.text(`${d.orders} orders`, 180, rowY);
          doc.text(`₹${d.revenue.toLocaleString('en-IN')}`, 300, rowY);

          // Mini bar
          const barWidth = Math.min(130, (d.revenue / maxDailyRev) * 130);
          doc.rect(400, rowY + 1, Math.max(barWidth, 3), 8).fill(primaryColor);

          rowY += 16;
        });

        doc.y = rowY + 15;

        // Peak Hours Distribution
        doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('Hourly Peak Demand');
        doc.moveDown(0.5);

        const peakY = doc.y;
        const maxPeak = Math.max(...metrics.peakHours.map(p => p.count), 1);

        metrics.peakHours.slice(0, 8).forEach((p, idx) => {
          const px = 40 + (idx % 4) * 130;
          const py = peakY + Math.floor(idx / 4) * 35;
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(darkColor).text(p.hour, px, py);
          const barW = Math.min(110, (p.count / maxPeak) * 110);
          doc.rect(px, py + 12, Math.max(barW, 2), 6).fill('#3b82f6');
          doc.fontSize(8).font('Helvetica').fillColor(mutedColor).text(`${p.count} orders`, px + 65, py);
        });

        this.drawFooter(doc, 2, 4);

        // ── PAGE 3: PRODUCTS, CUSTOMERS & REVIEWS ─────────────────────────────
        doc.addPage();

        doc.fillColor(darkColor).fontSize(16).font('Helvetica-Bold').text('Product & Customer Insights');
        doc.strokeColor(primaryColor).lineWidth(2).moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();
        doc.moveDown(1.5);

        // Top Selling Products Table
        doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('Top 5 Best Selling Items');
        doc.moveDown(0.5);

        let pTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(mutedColor);
        doc.text('#', 50, pTop);
        doc.text('Item Name', 80, pTop);
        doc.text('Quantity Sold', 320, pTop);
        doc.text('Total Revenue', 440, pTop);

        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, pTop + 14).lineTo(555, pTop + 14).stroke();
        pTop += 20;

        metrics.topSellingProducts.slice(0, 5).forEach((item, index) => {
          doc.fontSize(8.5).font('Helvetica').fillColor(darkColor);
          doc.text(`${index + 1}`, 50, pTop);
          doc.text(item.name, 80, pTop);
          doc.text(`${item.quantity} units`, 320, pTop);
          doc.text(`₹${item.revenue.toLocaleString('en-IN')}`, 440, pTop);
          pTop += 16;
        });

        doc.y = pTop + 15;

        // Customer Growth & Reviews Summary Side-by-Side
        const colY = doc.y;
        doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('Customer Acquisition', 40, colY);
        doc.text('Customer Reviews Summary', 300, colY);

        doc.moveDown(1);
        const colContentY = doc.y;

        // Customer box
        doc.rect(40, colContentY, 230, 90).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text(`New Customers: ${metrics.newCustomers}`, 55, colContentY + 15);
        doc.fontSize(10).font('Helvetica-Bold').text(`Returning Customers: ${metrics.returningCustomers}`, 55, colContentY + 35);
        doc.fontSize(10).font('Helvetica-Bold').text(`Active Customers: ${metrics.totalActiveCustomers}`, 55, colContentY + 55);

        // Review box
        doc.rect(300, colContentY, 255, 90).fillAndStroke('#fff7ed', '#ffedd5');
        doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text(`⭐ ${metrics.averageRating.toFixed(1)} / 5.0`, 315, colContentY + 15);
        doc.fillColor(darkColor).fontSize(10).font('Helvetica').text(`Based on ${metrics.totalReviews} verified customer reviews`, 315, colContentY + 52);

        this.drawFooter(doc, 3, 4);

        // ── PAGE 4: INFRASTRUCTURE & DIAGNOSTICS AUDIT ───────────────────────
        doc.addPage();

        doc.fillColor(darkColor).fontSize(16).font('Helvetica-Bold').text('System Infrastructure & Communication Health');
        doc.strokeColor(primaryColor).lineWidth(2).moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();
        doc.moveDown(1.5);

        const diagY = doc.y;
        this.drawMetricCard(doc, 40, diagY, 160, 60, 'FCM Push Sent', `${metrics.notificationsSent}`, darkColor);
        this.drawMetricCard(doc, 215, diagY, 160, 60, 'Emails Dispatched', `${metrics.emailsSent}`, darkColor);
        this.drawMetricCard(doc, 390, diagY, 165, 60, 'Email Success Rate', `${metrics.emailSuccessRate}%`, greenColor);

        doc.y = diagY + 80;

        // Delivery Partners Summary Table
        doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('Delivery Partner Fleet Activity');
        doc.moveDown(0.5);

        let dpTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(mutedColor);
        doc.text('Partner Name', 50, dpTop);
        doc.text('Deliveries Completed', 260, dpTop);
        doc.text('Rating', 440, dpTop);

        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, dpTop + 14).lineTo(555, dpTop + 14).stroke();
        dpTop += 20;

        if (metrics.deliveryPartnerStats.length === 0) {
          doc.fontSize(9).font('Helvetica').fillColor(mutedColor).text('No partner statistics available for this period.', 50, dpTop);
        } else {
          metrics.deliveryPartnerStats.forEach((dp) => {
            doc.fontSize(8.5).font('Helvetica').fillColor(darkColor);
            doc.text(dp.name, 50, dpTop);
            doc.text(`${dp.completedCount} orders`, 260, dpTop);
            doc.text(`⭐ ${dp.rating.toFixed(1)}`, 440, dpTop);
            dpTop += 16;
          });
        }

        doc.y = dpTop + 30;

        // Official Sign-off Notice
        doc.rect(40, doc.y, 515, 50).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text('CONFIDENTIALITY & SYSTEM INTEGRITY NOTICE', 55, doc.y + 10);
        doc.fontSize(8).font('Helvetica').fillColor(mutedColor).text('This report was generated automatically by the Olive Pizza Backend Reporting Engine. Primary business data is strictly preserved in Firestore.', 55, doc.y + 24);

        this.drawFooter(doc, 4, 4);

        // Finalize PDF Document
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private drawMetricCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, title: string, value: string, valueColor: string) {
    doc.rect(x, y, width, height).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Bold').text(title.toUpperCase(), x + 10, y + 10);
    doc.fillColor(valueColor).fontSize(15).font('Helvetica-Bold').text(value, x + 10, y + 26);
  }

  private drawProgressBar(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, segments: { label: string; percent: number; color: string }[]) {
    let currentX = x;
    segments.forEach(seg => {
      const segWidth = (seg.percent / 100) * width;
      if (segWidth > 0) {
        doc.rect(currentX, y, segWidth, height).fill(seg.color);
        currentX += segWidth;
      }
    });
  }

  private drawFooter(doc: PDFKit.PDFDocument, currentPage: number, totalPages: number) {
    const bottomY = 780;
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, bottomY - 10).lineTo(555, bottomY - 10).stroke();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('Olive Pizza Inc. • Automated Business Intelligence', 40, bottomY);
    doc.text(`Page ${currentPage} of ${totalPages}`, 40, bottomY, { align: 'right' });
  }
}

export const pdfGenerator = new PdfGenerator();

import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

export interface MonthlyReportData {
  month: string;
  totalRevenue: number;
  totalOrders: number;
  topSellingPizzas: { name: string; quantity: number }[];
  topCustomers: { name: string; orders: number; spent: number }[];
  couponUsage: { code: string; count: number }[];
  deliveryStatistics: { avgTimeMinutes: number; onTimePercentage: number };
  cancelledOrders: number;
  averageOrderValue: number;
  monthlyGrowth: { revenue: number; orders: number }; // percentages
  revenueChartData: { labels: string[]; data: number[] };
  orderChartData: { labels: string[]; data: number[] };
}

export class PdfGenerator {
  private chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor() {
    // Width and height of the charts
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 500, height: 300, backgroundColour: 'white' });
  }

  private async generateChartImage(labels: string[], data: number[], label: string, color: string): Promise<Buffer> {
    const configuration: any = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: label }
        }
      }
    };
    return await this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  public async generateReport(data: MonthlyReportData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Title
        doc.fontSize(24).text(`Monthly Business Report - ${data.month}`, { align: 'center' });
        doc.moveDown(2);

        // Summary Statistics
        doc.fontSize(16).text('Executive Summary', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Total Revenue: $${data.totalRevenue.toFixed(2)}`);
        doc.text(`Total Orders: ${data.totalOrders}`);
        doc.text(`Average Order Value: $${data.averageOrderValue.toFixed(2)}`);
        doc.text(`Cancelled Orders: ${data.cancelledOrders}`);
        doc.text(`Revenue Growth: ${data.monthlyGrowth.revenue > 0 ? '+' : ''}${data.monthlyGrowth.revenue.toFixed(2)}%`);
        doc.text(`Orders Growth: ${data.monthlyGrowth.orders > 0 ? '+' : ''}${data.monthlyGrowth.orders.toFixed(2)}%`);
        doc.moveDown(2);

        // Delivery Stats
        doc.fontSize(16).text('Delivery Statistics', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Average Delivery Time: ${data.deliveryStatistics.avgTimeMinutes} minutes`);
        doc.text(`On-Time Delivery Rate: ${data.deliveryStatistics.onTimePercentage}%`);
        doc.moveDown(2);

        // Charts
        doc.fontSize(16).text('Revenue & Order Trends', { underline: true });
        doc.moveDown();
        
        const revenueChartBuffer = await this.generateChartImage(data.revenueChartData.labels, data.revenueChartData.data, 'Daily Revenue ($)', '#4CAF50');
        doc.image(revenueChartBuffer, { width: 400, align: 'center' });
        doc.moveDown();

        const orderChartBuffer = await this.generateChartImage(data.orderChartData.labels, data.orderChartData.data, 'Daily Orders', '#2196F3');
        doc.image(orderChartBuffer, { width: 400, align: 'center' });
        
        doc.addPage();

        // Top Lists
        doc.fontSize(16).text('Top Selling Pizzas', { underline: true });
        doc.moveDown();
        data.topSellingPizzas.forEach((pizza, index) => {
          doc.fontSize(12).text(`${index + 1}. ${pizza.name} - ${pizza.quantity} sold`);
        });
        doc.moveDown(2);

        doc.fontSize(16).text('Top Customers', { underline: true });
        doc.moveDown();
        data.topCustomers.forEach((customer, index) => {
          doc.fontSize(12).text(`${index + 1}. ${customer.name} - ${customer.orders} orders ($${customer.spent.toFixed(2)})`);
        });
        doc.moveDown(2);

        doc.fontSize(16).text('Coupon Usage', { underline: true });
        doc.moveDown();
        data.couponUsage.forEach((coupon) => {
          doc.fontSize(12).text(`${coupon.code}: Used ${coupon.count} times`);
        });

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

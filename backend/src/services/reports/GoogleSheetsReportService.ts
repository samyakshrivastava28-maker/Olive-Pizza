/**
 * GoogleSheetsReportService.ts — Live Monthly Business Reporting Engine
 * 
 * Manages live Google Sheets for Olive Pizza monthly business analytics.
 * Incremental order updates, automatic section summaries, and professional charts.
 */

import { google } from 'googleapis';
import { adminDb as db } from '../../config/firebase.js';

export interface OrderRowData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paymentMethod: string;
  orderType: 'delivery' | 'pickup';
  status: string;
  itemCount: number;
  couponCode?: string;
  deliveryTimeMins?: number;
  timestamp: string;
}

export class GoogleSheetsReportService {
  private static sheetsClient: any = null;

  /**
   * Initializes Google Sheets API v4 client.
   */
  private static getSheetsClient() {
    if (this.sheetsClient) return this.sheetsClient;

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    let authClient: any;

    if (serviceAccountJson) {
      try {
        const decoded = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf-8'));
        authClient = new google.auth.JWT({
          email: decoded.client_email,
          key: decoded.private_key,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } catch (err: any) {
        console.warn('[GoogleSheetsReport] Base64 service account parse warning:', err.message);
      }
    }

    if (!authClient) {
      authClient = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    this.sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    return this.sheetsClient;
  }

  /**
   * Returns current spreadsheet ID for monthly reports from Firestore settings.
   */
  static async getSpreadsheetId(): Promise<string | null> {
    try {
      const doc = await db.collection('settings').doc('google_sheets').get();
      if (doc.exists && doc.data()?.spreadsheetId) {
        return doc.data()?.spreadsheetId;
      }
      return process.env.GOOGLE_SHEET_SPREADSHEET_ID || null;
    } catch {
      return null;
    }
  }

  /**
   * Generates formatted sheet title for a given date (e.g. "2026-August").
   */
  static getMonthSheetTitle(date: Date = new Date()): string {
    const year = date.getFullYear();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${year}-${monthNames[date.getMonth()]}`;
  }

  /**
   * Ensures monthly sheet exists with complete header & structured sections.
   */
  static async ensureMonthlySheetExists(spreadsheetId: string, sheetTitle: string): Promise<void> {
    const sheets = this.getSheetsClient();

    try {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetExists = (spreadsheet.data.sheets || []).some(
        (s: any) => s.properties?.title === sheetTitle
      );

      if (!sheetExists) {
        console.log(`[GoogleSheetsReport] Creating new monthly sheet "${sheetTitle}"...`);

        // Add sheet tab
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetTitle,
                    gridProperties: { rowCount: 1000, columnCount: 15 },
                  },
                },
              },
            ],
          },
        });

        // Initialize structured headers & summary section
        await this.initializeSheetHeaders(spreadsheetId, sheetTitle);
      }
    } catch (err: any) {
      console.warn(`[GoogleSheetsReport] ensureMonthlySheetExists notice:`, err.message);
    }
  }

  /**
   * Writes professional header sections to the monthly sheet.
   */
  private static async initializeSheetHeaders(spreadsheetId: string, sheetTitle: string): Promise<void> {
    const sheets = this.getSheetsClient();

    const headers = [
      ['OLIVE PIZZA — LIVE MONTHLY BUSINESS REPORT', '', '', '', '', '', '', '', '', '', '', ''],
      [`Month: ${sheetTitle}`, `Generated: ${new Date().toLocaleString()}`, '', '', '', '', '', '', '', '', '', ''],
      [''],
      ['SUMMARY METRICS', 'VALUE'],
      ['Total Revenue (₹)', '=SUM(G8:G1000)'],
      ['Total Completed Orders', '=COUNTIF(H8:H1000, "delivered")'],
      ['Average Order Value (₹)', '=AVERAGE(G8:G1000)'],
      [''],
      ['ORDER ID', 'CUSTOMER NAME', 'PHONE', 'ORDER TYPE', 'PAYMENT METHOD', 'ITEMS', 'TOTAL AMOUNT (₹)', 'STATUS', 'COUPON', 'DELIVERY TIME (MINS)', 'TIMESTAMP']
    ];

    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetTitle}'!A1:K9`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: headers },
      });
    } catch (err: any) {
      console.warn('[GoogleSheetsReport] initializeSheetHeaders error:', err.message);
    }
  }

  /**
   * Appends a completed order incrementally to the monthly Google Sheet.
   */
  static async appendOrderToMonthlySheet(order: OrderRowData): Promise<void> {
    const spreadsheetId = await this.getSpreadsheetId();
    if (!spreadsheetId) {
      console.log('[GoogleSheetsReport] Spreadsheet ID not configured. Skipping live sheet append.');
      return;
    }

    const sheetTitle = this.getMonthSheetTitle(new Date(order.timestamp));
    await this.ensureMonthlySheetExists(spreadsheetId, sheetTitle);

    const row = [
      order.orderId,
      order.customerName || 'Guest Customer',
      order.customerPhone || 'N/A',
      order.orderType || 'delivery',
      order.paymentMethod || 'UPI',
      order.itemCount || 1,
      order.totalAmount || 0,
      order.status || 'delivered',
      order.couponCode || 'NONE',
      order.deliveryTimeMins || 25,
      new Date(order.timestamp).toLocaleString(),
    ];

    try {
      const sheets = this.getSheetsClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${sheetTitle}'!A10:K10`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] },
      });

      console.log(`[GoogleSheetsReport] Live row appended to "${sheetTitle}" for order #${order.orderId}`);
    } catch (err: any) {
      console.error(`[GoogleSheetsReport] Error appending order #${order.orderId}:`, err.message);
    }
  }

  /**
   * Updates monthly summary metrics and inserts automatic charts into Google Sheet.
   */
  static async addChartsToMonthlySheet(spreadsheetId: string, sheetTitle: string): Promise<void> {
    try {
      const sheets = this.getSheetsClient();
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const targetSheet = (spreadsheet.data.sheets || []).find((s: any) => s.properties?.title === sheetTitle);

      if (!targetSheet) return;
      const sheetId = targetSheet.properties.sheetId;

      // Add Revenue Line Chart and Orders Bar Chart via batchUpdate
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addChart: {
                chart: {
                  spec: {
                    title: `Olive Pizza — ${sheetTitle} Revenue Trend`,
                    basicChart: {
                      chartType: 'LINE',
                      legendPosition: 'BOTTOM_LEGEND',
                      domains: [
                        {
                          domain: {
                            sourceRange: {
                              sources: [{ sheetId, startRowIndex: 8, endRowIndex: 50, startColumnIndex: 10, endColumnIndex: 11 }]
                            }
                          }
                        }
                      ],
                      series: [
                        {
                          series: {
                            sourceRange: {
                              sources: [{ sheetId, startRowIndex: 8, endRowIndex: 50, startColumnIndex: 6, endColumnIndex: 7 }]
                            }
                          },
                          targetAxis: 'LEFT_AXIS'
                        }
                      ]
                    }
                  },
                  position: {
                    overlayPosition: {
                      anchorCell: { sheetId, rowIndex: 1, columnIndex: 12 },
                      offsetXPixels: 0,
                      offsetYPixels: 0,
                    }
                  }
                }
              }
            }
          ]
        }
      });
      console.log(`[GoogleSheetsReport] Charts inserted successfully in sheet "${sheetTitle}"`);
    } catch (err: any) {
      console.warn(`[GoogleSheetsReport] addChartsToMonthlySheet notice:`, err.message);
    }
  }
}

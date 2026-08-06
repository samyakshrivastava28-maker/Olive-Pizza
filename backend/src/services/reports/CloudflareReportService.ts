/**
 * CloudflareReportService.ts — Cloudflare R2 PDF Monthly Report Manager
 * 
 * Manages PDF report uploads, secure pre-signed URLs, listing, and deletion
 * in Cloudflare R2 under path: reports/<Year>/Olive-Pizza-<MonthYear>.pdf
 */

import { CloudflareR2Service } from '../storage/CloudflareR2Service.js';
import { adminDb as db } from '../../config/firebase.js';

export interface MonthlyReportMetadata {
  id: string;
  month: string;
  year: number;
  revenue: number;
  orders: number;
  reportUrl?: string;
  downloadUrl?: string;
  cloudflarePath: string;
  createdTime: string;
  pdfSize: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export class CloudflareReportService {
  /**
   * Uploads a monthly PDF report buffer to Cloudflare R2.
   */
  static async uploadPdfReport(
    year: number,
    monthName: string,
    pdfBuffer: Buffer
  ): Promise<{ cloudflarePath: string; publicUrl?: string; sizeFormatted: string }> {
    const key = `reports/${year}/Olive-Pizza-${monthName}${year}.pdf`;
    const sizeKb = (pdfBuffer.length / 1024).toFixed(1);
    const sizeFormatted = pdfBuffer.length > 1024 * 1024
      ? `${(pdfBuffer.length / (1024 * 1024)).toFixed(2)} MB`
      : `${sizeKb} KB`;

    console.log(`[CloudflareReportService] Uploading PDF report to R2: "${key}" (${sizeFormatted})...`);

    const result = await CloudflareR2Service.uploadBuffer(key, pdfBuffer, 'application/pdf');

    return {
      cloudflarePath: key,
      publicUrl: result.url,
      sizeFormatted,
    };
  }

  /**
   * Generates secure time-limited view and download URLs for a report.
   */
  static async getReportUrls(cloudflarePath: string, expiresInSeconds: number = 86400): Promise<{ viewUrl: string | null; downloadUrl: string | null }> {
    if (!CloudflareR2Service.isConfigured()) {
      return { viewUrl: null, downloadUrl: null };
    }

    try {
      const viewUrl = await CloudflareR2Service.generatePreSignedUrl(cloudflarePath, expiresInSeconds);
      const downloadUrl = viewUrl ? `${viewUrl}&response-content-disposition=attachment` : null;

      return { viewUrl, downloadUrl };
    } catch (err: any) {
      console.error(`[CloudflareReportService] Error generating URLs for "${cloudflarePath}":`, err.message);
      return { viewUrl: null, downloadUrl: null };
    }
  }

  /**
   * Archives report metadata into Firestore collection `monthly_reports`.
   */
  static async saveReportMetadata(metadata: MonthlyReportMetadata): Promise<void> {
    try {
      await db.collection('monthly_reports').doc(metadata.id).set(metadata, { merge: true });
      console.log(`[CloudflareReportService] Saved report metadata for "${metadata.id}" in Firestore.`);
    } catch (err: any) {
      console.error(`[CloudflareReportService] Error saving metadata for "${metadata.id}":`, err.message);
    }
  }

  /**
   * Deletes a monthly report from Cloudflare R2 and Firestore.
   */
  static async deleteReport(reportId: string, cloudflarePath?: string): Promise<boolean> {
    try {
      if (cloudflarePath) {
        await CloudflareR2Service.deleteObject(cloudflarePath);
      }
      await db.collection('monthly_reports').doc(reportId).delete();
      console.log(`[CloudflareReportService] Successfully deleted report "${reportId}"`);
      return true;
    } catch (err: any) {
      console.error(`[CloudflareReportService] Error deleting report "${reportId}":`, err.message);
      return false;
    }
  }

  /**
   * Lists all monthly reports from Firestore and updates signed URLs.
   */
  static async listMonthlyReports(): Promise<MonthlyReportMetadata[]> {
    try {
      const snap = await db.collection('monthly_reports').orderBy('createdTime', 'desc').get();
      const reports: MonthlyReportMetadata[] = [];

      for (const doc of snap.docs) {
        const item = doc.data() as MonthlyReportMetadata;
        if (item.cloudflarePath) {
          const urls = await this.getReportUrls(item.cloudflarePath);
          item.reportUrl = urls.viewUrl || item.reportUrl;
          item.downloadUrl = urls.downloadUrl || item.downloadUrl;
        }
        reports.push(item);
      }

      return reports;
    } catch (err: any) {
      console.error('[CloudflareReportService] Error listing monthly reports:', err.message);
      return [];
    }
  }
}

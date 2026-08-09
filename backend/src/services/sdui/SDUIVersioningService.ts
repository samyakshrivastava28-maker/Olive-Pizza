/**
 * SDUIVersioningService.ts — SDUI Design Version Management
 *
 * Manages versioned SDUI design packages in Cloudflare R2.
 * Each published version is stored atomically in:
 *   olive-pizza/sdui/home/versions/v{N}.json
 * The live manifest is tracked in:
 *   olive-pizza/sdui/home/manifest.json
 * Firestore audit log is written to:
 *   sdui_version_history/{versionId}
 *
 * STRICT RULE: This service does NOT call AI, RAG, Pinecone, or any model router.
 * All design intelligence lives in Olive Pizza AI (accessed via OlivePizzaAISDK).
 */

import { adminDb as db } from '../../config/firebase.js';
import { CloudflareR2Service } from '../storage/CloudflareR2Service.js';

export type SDUIVersionStatus = 'DRAFT' | 'LIVE' | 'ARCHIVED';

export interface SDUIVersionRecord {
  versionId: string;
  versionNumber: number;
  status: SDUIVersionStatus;
  ownerPrompt?: string;
  explanation?: string;
  savedAt: string;
  publishedAt?: string;
  publishedBy?: string;
  r2Key: string;
  sectionCount: number;
  safetyScore?: number;
  designReasoning?: string;
  pipelineModels?: string[];
}

export interface SDUIManifest {
  liveVersionId: string | null;
  liveVersionNumber: number | null;
  lastUpdated: string;
  totalVersions: number;
  versions: SDUIVersionRecord[];
}

const MANIFEST_KEY = 'sdui/home/manifest.json';
const DEFAULT_UI_KEY = 'sdui/home/default_ui.json';

export class SDUIVersioningService {

  /**
   * Load the SDUI manifest from Cloudflare R2 (or initialize empty if missing).
   */
  static async getManifest(): Promise<SDUIManifest> {
    try {
      if (!CloudflareR2Service.isConfigured()) {
        return this._emptyManifest();
      }
      const raw = await CloudflareR2Service.downloadJson(MANIFEST_KEY);
      return raw as SDUIManifest;
    } catch {
      return this._emptyManifest();
    }
  }

  /**
   * Save a design draft to Cloudflare R2 with a new version number.
   * Returns the version record.
   */
  static async saveDesign(options: {
    sections: any[];
    ownerPrompt?: string;
    explanation?: string;
    safetyScore?: number;
    designReasoning?: string;
    pipelineModels?: string[];
    publishedBy?: string;
  }): Promise<SDUIVersionRecord> {
    const manifest = await this.getManifest();
    const versionNumber = manifest.totalVersions + 1;
    const versionId = `sdui_v${versionNumber}_${Date.now()}`;
    const r2Key = `sdui/home/versions/${versionId}.json`;
    const savedAt = new Date().toISOString();

    const versionPayload = {
      versionId,
      versionNumber,
      status: 'DRAFT' as SDUIVersionStatus,
      sections: options.sections,
      ownerPrompt: options.ownerPrompt || '',
      explanation: options.explanation || '',
      safetyScore: options.safetyScore,
      designReasoning: options.designReasoning,
      pipelineModels: options.pipelineModels || [],
      savedAt,
      publishedBy: options.publishedBy,
    };

    // Upload version JSON to R2
    if (CloudflareR2Service.isConfigured()) {
      await CloudflareR2Service.uploadJson(r2Key, versionPayload);
    }

    const record: SDUIVersionRecord = {
      versionId,
      versionNumber,
      status: 'DRAFT',
      ownerPrompt: options.ownerPrompt,
      explanation: options.explanation,
      savedAt,
      r2Key,
      sectionCount: options.sections.length,
      safetyScore: options.safetyScore,
      designReasoning: options.designReasoning,
      pipelineModels: options.pipelineModels,
    };

    // Update manifest
    const updatedManifest: SDUIManifest = {
      ...manifest,
      totalVersions: versionNumber,
      lastUpdated: savedAt,
      versions: [...manifest.versions, record],
    };
    if (CloudflareR2Service.isConfigured()) {
      await CloudflareR2Service.uploadJson(MANIFEST_KEY, updatedManifest);
    }

    // Firestore audit log
    await db.collection('sdui_version_history').doc(versionId).set({
      ...record,
      eventType: 'DESIGN_SAVED',
    }).catch(() => {});

    return record;
  }

  /**
   * Publish a saved draft version as the LIVE SDUI.
   * Archives the previous live version as ARCHIVED.
   */
  static async publishDesign(options: {
    versionId: string;
    publishedBy: string;
    publishedByEmail?: string;
    sections: any[];
  }): Promise<{ success: boolean; liveVersionId: string; archivedVersionId?: string }> {
    const manifest = await this.getManifest();
    const publishedAt = new Date().toISOString();

    // Find the version to publish
    const targetIdx = manifest.versions.findIndex(v => v.versionId === options.versionId);

    // Archive the current LIVE version
    let archivedVersionId: string | undefined;
    const updatedVersions = manifest.versions.map(v => {
      if (v.status === 'LIVE') {
        archivedVersionId = v.versionId;
        return { ...v, status: 'ARCHIVED' as SDUIVersionStatus };
      }
      if (v.versionId === options.versionId) {
        return { ...v, status: 'LIVE' as SDUIVersionStatus, publishedAt, publishedBy: options.publishedBy };
      }
      return v;
    });

    // If version wasn't in manifest yet, add it
    if (targetIdx === -1) {
      const newVersionNumber = manifest.totalVersions + 1;
      const r2Key = `sdui/home/versions/${options.versionId}.json`;
      updatedVersions.push({
        versionId: options.versionId,
        versionNumber: newVersionNumber,
        status: 'LIVE',
        savedAt: publishedAt,
        publishedAt,
        publishedBy: options.publishedBy,
        r2Key,
        sectionCount: options.sections.length,
      });
    }

    const updatedManifest: SDUIManifest = {
      liveVersionId: options.versionId,
      liveVersionNumber: updatedVersions.find(v => v.versionId === options.versionId)?.versionNumber ?? manifest.totalVersions,
      lastUpdated: publishedAt,
      totalVersions: Math.max(manifest.totalVersions, updatedVersions.length),
      versions: updatedVersions,
    };

    if (CloudflareR2Service.isConfigured()) {
      // Save the live sections payload
      await CloudflareR2Service.uploadJson(`sdui/home/versions/${options.versionId}.json`, {
        ...updatedVersions.find(v => v.versionId === options.versionId),
        sections: options.sections,
      });
      await CloudflareR2Service.uploadJson(MANIFEST_KEY, updatedManifest);
    }

    // Firestore audit log
    await db.collection('sdui_version_history').doc(`publish_${options.versionId}`).set({
      versionId: options.versionId,
      publishedBy: options.publishedBy,
      publishedAt,
      eventType: 'DESIGN_PUBLISHED',
      archivedVersionId,
    }).catch(() => {});

    return { success: true, liveVersionId: options.versionId, archivedVersionId };
  }

  /**
   * Rollback to a specific previous version (makes it LIVE, archives current).
   */
  static async rollbackToVersion(options: {
    targetVersionId: string;
    publishedBy: string;
  }): Promise<{ success: boolean; message: string }> {
    const manifest = await this.getManifest();
    const target = manifest.versions.find(v => v.versionId === options.targetVersionId);
    if (!target) {
      throw new Error(`Version ${options.targetVersionId} not found in manifest.`);
    }

    // Load sections from R2
    let sections: any[] = [];
    if (CloudflareR2Service.isConfigured()) {
      try {
        const data = await CloudflareR2Service.downloadJson(target.r2Key) as any;
        sections = data.sections || [];
      } catch {
        sections = [];
      }
    }

    await this.publishDesign({ versionId: options.targetVersionId, publishedBy: options.publishedBy, sections });

    // Firestore audit log
    await db.collection('sdui_version_history').doc(`rollback_${Date.now()}`).set({
      targetVersionId: options.targetVersionId,
      publishedBy: options.publishedBy,
      eventType: 'DESIGN_ROLLBACK',
      rolledBackAt: new Date().toISOString(),
    }).catch(() => {});

    return { success: true, message: `Rolled back to version ${target.versionNumber} (${options.targetVersionId}).` };
  }

  /**
   * Restore the hardcoded default Olive Pizza baseline UI.
   */
  static async restoreDefaultUI(publishedBy: string): Promise<{ success: boolean; message: string }> {
    // Load default UI from R2 if it exists, otherwise use DEFAULT_HOMEPAGE_CONFIG sections
    let defaultSections: any[] = [];
    if (CloudflareR2Service.isConfigured()) {
      try {
        const data = await CloudflareR2Service.downloadJson(DEFAULT_UI_KEY) as any;
        defaultSections = data?.sections || [];
      } catch {
        defaultSections = [];
      }
    }

    const defaultVersionId = `default_restore_${Date.now()}`;

    if (CloudflareR2Service.isConfigured()) {
      await CloudflareR2Service.uploadJson(`sdui/home/versions/${defaultVersionId}.json`, {
        versionId: defaultVersionId,
        sections: defaultSections,
        restoredFrom: 'default_ui',
        restoredAt: new Date().toISOString(),
        publishedBy,
      });
    }

    await this.publishDesign({ versionId: defaultVersionId, publishedBy, sections: defaultSections });

    await db.collection('sdui_version_history').doc(`restore_default_${Date.now()}`).set({
      versionId: defaultVersionId,
      publishedBy,
      eventType: 'DESIGN_RESTORE_DEFAULT',
      restoredAt: new Date().toISOString(),
    }).catch(() => {});

    return { success: true, message: 'Default Olive Pizza UI restored successfully.' };
  }

  /**
   * List all design versions from the manifest.
   */
  static async listVersions(): Promise<SDUIManifest> {
    return this.getManifest();
  }

  /**
   * Download the sections for a specific version from R2.
   */
  static async getVersionSections(versionId: string): Promise<any[]> {
    const manifest = await this.getManifest();
    const record = manifest.versions.find(v => v.versionId === versionId);
    if (!record) throw new Error(`Version ${versionId} not found.`);

    if (!CloudflareR2Service.isConfigured()) return [];
    const data = await CloudflareR2Service.downloadJson(record.r2Key) as any;
    return data.sections || [];
  }

  private static _emptyManifest(): SDUIManifest {
    return {
      liveVersionId: null,
      liveVersionNumber: null,
      lastUpdated: new Date().toISOString(),
      totalVersions: 0,
      versions: [],
    };
  }
}

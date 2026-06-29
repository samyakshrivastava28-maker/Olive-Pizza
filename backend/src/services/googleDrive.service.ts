import { google, drive_v3 } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GoogleDriveService {
  private drive: drive_v3.Drive | null = null;
  public isEnabled: boolean = false;
  private authClient: any = null;

  constructor() {
    this.isEnabled = process.env.GOOGLE_DRIVE_ENABLED === 'true';
    if (!this.isEnabled) {
      console.log('[Google Drive] Service is disabled via GOOGLE_DRIVE_ENABLED=false');
      return;
    }

    const serviceAccountPath = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      console.error('[Google Drive] GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH is not configured.');
      this.isEnabled = false;
      return;
    }

    // Resolve path relative to project root (process.cwd())
    // Fallback if someone runs this deeply nested
    let absolutePath = path.resolve(process.cwd(), serviceAccountPath);
    if (!fs.existsSync(absolutePath)) {
      absolutePath = path.resolve(__dirname, '../../', serviceAccountPath);
    }

    if (!fs.existsSync(absolutePath)) {
      console.error(`[Google Drive] Service account file not found at: ${absolutePath}. Did you move the JSON file?`);
      this.isEnabled = false;
      return;
    }

    try {
      this.authClient = new google.auth.GoogleAuth({
        keyFile: absolutePath,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.drive = google.drive({ version: 'v3', auth: this.authClient });
      console.log('[Google Drive] Service initialized securely.');
    } catch (error) {
      console.error('[Google Drive] Failed to initialize GoogleAuth. Check credentials.', error);
      this.isEnabled = false;
    }
  }

  public async getHealthStatus() {
    if (!this.isEnabled || !this.drive) {
      return { connected: false, error: 'Service disabled or failed to initialize' };
    }

    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      
      // Attempt to access drive
      const response = await this.drive.about.get({
        fields: 'user, storageQuota'
      });

      let folderAccessible = false;
      if (folderId) {
        try {
          const folderInfo = await this.drive.files.get({ fileId: folderId, fields: 'id, name' });
          if (folderInfo.data.id) folderAccessible = true;
        } catch (fErr) {
          console.error('[Google Drive] Folder access error');
        }
      }

      return {
        connected: true,
        user: response.data.user?.emailAddress,
        folderConfigured: !!folderId,
        folderAccessible
      };
    } catch (error) {
      return { connected: false, error: 'Failed to connect to Google Drive API' };
    }
  }

  public async uploadBuffer(fileName: string, buffer: Buffer, mimeType: string): Promise<string | null> {
    if (!this.isEnabled || !this.drive) {
      throw new Error('Google Drive service is not enabled.');
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: folderId ? [folderId] : []
    };

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    try {
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });
      return response.data.id || null;
    } catch (error) {
      console.error('[Google Drive] Upload failed');
      throw new Error('Failed to upload file to Google Drive.');
    }
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    if (!this.isEnabled || !this.drive) return false;
    try {
      await this.drive.files.delete({ fileId });
      return true;
    } catch (error) {
      console.error(`[Google Drive] Failed to delete file ${fileId}`);
      return false;
    }
  }
}

export const googleDriveService = new GoogleDriveService();

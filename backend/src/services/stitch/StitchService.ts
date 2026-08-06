import axios from 'axios';
import { StitchColorMapper } from './StitchColorMapper.js';

const STITCH_API_BASE = 'https://stitch.withgoogle.com/api/v1';
const STITCH_API_KEY = process.env.STITCH_API_KEY;

export interface StitchDesign {
  id: string;
  name: string;
  layout: any;
  components: any[];
}

export class StitchService {
  /**
   * Fetches a specific design from Google Stitch by ID with full diagnostic logging.
   */
  static async getDesign(designId: string): Promise<StitchDesign> {
    const startTime = Date.now();
    console.log(`[Google Stitch Logger] Request Sent to Stitch for design ID: "${designId}" at ${new Date().toISOString()}`);

    if (!STITCH_API_KEY) {
      console.warn('[Google Stitch Logger] Error: STITCH_API_KEY is not configured in environment variables.');
      throw new Error('STITCH_API_KEY is not configured.');
    }

    try {
      const response = await axios.get(`${STITCH_API_BASE}/designs/${designId}`, {
        headers: {
          'Authorization': `Bearer ${STITCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      const latencyMs = Date.now() - startTime;
      console.log(`[Google Stitch Logger] Response Received from Stitch in ${latencyMs}ms. Status: 200 OK.`);
      return response.data;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      console.error(`[Google Stitch Logger] Error fetching design after ${latencyMs}ms:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch design from Google Stitch');
    }
  }

  /**
   * Fetches recent designs from Google Stitch with full diagnostic logging.
   */
  static async listDesigns(limit: number = 10): Promise<{ designs: StitchDesign[]; latencyMs: number; success: boolean; error?: string }> {
    const startTime = Date.now();
    console.log(`[Google Stitch Logger] Requesting top ${limit} designs from Google Stitch API...`);

    if (!STITCH_API_KEY) {
      const latencyMs = Date.now() - startTime;
      console.warn(`[Google Stitch Logger] STITCH_API_KEY missing. Returning fallback state.`);
      return { designs: [], latencyMs, success: false, error: 'STITCH_API_KEY not configured' };
    }

    try {
      const response = await axios.get(`${STITCH_API_BASE}/designs?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${STITCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      const latencyMs = Date.now() - startTime;
      const designs = response.data.designs || [];
      console.log(`[Google Stitch Logger] Successfully fetched ${designs.length} Stitch designs in ${latencyMs}ms.`);
      return { designs, latencyMs, success: true };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = error.response?.data?.message || error.message || 'Stitch API unreachable';
      console.error(`[Google Stitch Logger] Stitch API Error after ${latencyMs}ms: ${errMsg}`);
      return { designs: [], latencyMs, success: false, error: errMsg };
    }
  }

  /**
   * Converts Google Stitch component layouts into SDUI section format.
   */
  static convertStitchToSDUI(stitchDesign: StitchDesign): any {
    const brandedLayout = StitchColorMapper.enforceBrandColors(stitchDesign.layout || {});
    return {
      id: `stitch_${stitchDesign.id}`,
      type: 'custom',
      label: `✨ Stitch: ${stitchDesign.name}`,
      subtitle: 'Google Stitch 3D Layout Component',
      isVisible: true,
      order: 0,
      style: brandedLayout,
      config: {
        stitchId: stitchDesign.id,
        stitchComponents: stitchDesign.components || [],
      },
    };
  }
}

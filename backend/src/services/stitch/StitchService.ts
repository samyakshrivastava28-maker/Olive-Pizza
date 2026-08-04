import axios from 'axios';

const STITCH_API_BASE = 'https://stitch.withgoogle.com/api/v1'; // Assuming this based on standard REST practices for Stitch
const STITCH_API_KEY = process.env.STITCH_API_KEY;

export interface StitchDesign {
  id: string;
  name: string;
  layout: any;
  components: any[];
}

import { StitchColorMapper } from './StitchColorMapper.js';

export class StitchService {
  /**
   * Fetches a specific design from Google Stitch by ID.
   */
  static async getDesign(designId: string): Promise<StitchDesign> {
    if (!STITCH_API_KEY) {
      throw new Error('STITCH_API_KEY is not configured in environment variables.');
    }

    try {
      const response = await axios.get(`${STITCH_API_BASE}/designs/${designId}`, {
        headers: {
          'Authorization': `Bearer ${STITCH_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('[StitchService] Error fetching design:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch design from Google Stitch');
    }
  }

  /**
   * Fetches recent designs from the owner's Google Stitch account.
   */
  static async listDesigns(limit: number = 10): Promise<StitchDesign[]> {
    if (!STITCH_API_KEY) {
      throw new Error('STITCH_API_KEY is not configured in environment variables.');
    }

    try {
      const response = await axios.get(`${STITCH_API_BASE}/designs?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${STITCH_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data.designs || [];
    } catch (error: any) {
      console.error('[StitchService] Error listing designs:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to list designs from Google Stitch');
    }
  }

  /**
   * Converts a Google Stitch layout into Olive Pizza Server Driven UI format.
   * This bridges the gap between Stitch's visual node tree and SDUI JSON.
   */
  static convertStitchToSDUI(stitchDesign: StitchDesign): any {
    // 🚧 Enforce Brand Colors strictly before accepting the design
    const brandedLayout = StitchColorMapper.enforceBrandColors(stitchDesign.layout);

    return {
      type: 'custom',
      stitchId: stitchDesign.id,
      html: `<div><!-- Imported from Stitch: ${stitchDesign.name} --></div>`,
      rawStitchData: brandedLayout
    };
  }
}

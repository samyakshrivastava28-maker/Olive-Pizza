import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Get version settings (public)
router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_update_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin ONLY routes below (assuming some auth middleware, I will use a simple check or rely on caller for now)
// In a real app we'd add `requireAdmin` middleware.

router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const { version_string, build_number, release_notes, features, bug_fixes, update_mode, update_minimum } = req.body;

    // Insert new version
    const { data: newVersion, error: insertError } = await supabase
      .from('app_versions')
      .insert([{
        version_string,
        build_number,
        release_notes,
        features: features || [],
        bug_fixes: bug_fixes || [],
        status: 'published'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Update settings
    const { data: currentSettings, error: settingsError } = await supabase
      .from('app_update_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError) throw settingsError;

    const updates = {
      latest_version: version_string,
      update_mode: update_mode || currentSettings.update_mode,
      minimum_version: update_minimum ? version_string : currentSettings.minimum_version,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('app_update_settings')
      .update(updates)
      .eq('id', 1);

    if (updateError) throw updateError;

    // Clear cache if possible or just rely on TTL in middleware

    res.json({ success: true, version: newVersion });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
    try {
        const { update_mode, minimum_version, maintenance_mode } = req.body;
        
        const updates: any = { updated_at: new Date().toISOString() };
        if (update_mode !== undefined) updates.update_mode = update_mode;
        if (minimum_version !== undefined) updates.minimum_version = minimum_version;
        if (maintenance_mode !== undefined) updates.maintenance_mode = maintenance_mode;

        const { data, error } = await supabase
          .from('app_update_settings')
          .update(updates)
          .eq('id', 1)
          .select()
          .single();
    
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

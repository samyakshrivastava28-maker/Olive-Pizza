import { SectionVariant, SDUISection } from '../types/sdui.types';

const STORAGE_KEY = 'olive_sdui_owner_custom_sections';

export const getOwnerCustomSections = (): SectionVariant[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read owner custom sections:', e);
  }
  return [];
};

export const saveOwnerCustomSection = (section: SDUISection, customName?: string): SectionVariant => {
  const existing = getOwnerCustomSections();
  const id = `owner_custom_${Date.now()}`;
  const variant: SectionVariant = {
    id,
    name: customName || section.label || 'Custom Owner Section',
    emoji: '👑',
    category: 'custom',
    description: section.subtitle || `Generated with Google Stitch on ${new Date().toLocaleDateString()}`,
    type: section.type,
    defaultConfig: section.config || {},
    defaultStyle: section.style || {},
    premium: true,
  };

  const updated = [variant, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save owner custom section:', e);
  }

  return variant;
};

export const deleteOwnerCustomSection = (id: string): SectionVariant[] => {
  const existing = getOwnerCustomSections();
  const updated = existing.filter(v => v.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete owner custom section:', e);
  }
  return updated;
};

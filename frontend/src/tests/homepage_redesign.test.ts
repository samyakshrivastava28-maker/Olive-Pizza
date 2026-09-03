import { describe, it, expect } from 'vitest';
import { PREDEFINED_TEMPLATES } from '../utils/HomePageTemplates';

describe('Customer Homepage Redesign — Zero Fake Data Verification', () => {
  it('should not contain any forbidden fake rating strings in predefined templates', () => {
    const templateString = JSON.stringify(PREDEFINED_TEMPLATES);
    
    // Non-negotiable Section 1 forbidden patterns
    expect(templateString).not.toContain('4.9★');
    expect(templateString).not.toContain('4.8★');
    expect(templateString).not.toContain('30min');
    expect(templateString).not.toContain('20-min delivery guarantee');
    expect(templateString).not.toContain('20 Min Delivery Guarantee');
    expect(templateString).not.toContain('10,000+ orders');
    expect(templateString).not.toContain('50,000+');
    expect(templateString).not.toContain('Aarav Sharma');
    expect(templateString).not.toContain('Arjun K.');
  });

  it('should ensure all default hero and section media URLs use authentic assets, not unsplash in default template', () => {
    const defaultTemplate = PREDEFINED_TEMPLATES.find(t => t.pageId === 'default');
    expect(defaultTemplate).toBeDefined();

    const heroSection = defaultTemplate?.sections.find(s => s.type === 'HERO');
    expect(heroSection).toBeDefined();
    expect(heroSection?.config.mediaUrl).not.toContain('images.unsplash.com');
  });

  it('should validate homepage schema structure correctly', () => {
    const isValidSchema = (config: any): boolean => {
      return Boolean(config && typeof config === 'object' && Array.isArray(config.sections) && config.sections.length > 0);
    };

    // Valid schemas
    expect(isValidSchema(PREDEFINED_TEMPLATES[0])).toBe(true);

    // Invalid / malformed schemas that must trigger fallback
    expect(isValidSchema(null)).toBe(false);
    expect(isValidSchema(undefined)).toBe(false);
    expect(isValidSchema({})).toBe(false);
    expect(isValidSchema({ sections: [] })).toBe(false);
    expect(isValidSchema({ sections: 'invalid' })).toBe(false);
  });

  it('should ensure all required section types are handled in default template', () => {
    const defaultTemplate = PREDEFINED_TEMPLATES[0];
    const sectionTypes = defaultTemplate.sections.map(s => s.type);

    expect(sectionTypes).toContain('HERO');
    expect(sectionTypes).toContain('CRAVINGS');
    expect(sectionTypes).toContain('FEATURED');
    expect(sectionTypes).toContain('COUPONS');
    expect(sectionTypes).toContain('ADS');
  });
});

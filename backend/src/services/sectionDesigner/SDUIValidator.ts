/**
 * SDUIValidator.ts
 * Validates generated SDUI JSON against Olive Pizza brand rules and schema.
 */

const APPROVED_COLORS = [
  '#f97316', '#fb923c', '#0B0F14', '#0a0a0a', '#111827', '#121212', '#1e1e1e',
  '#f9fafb', '#ffffff', '#55775a', '#4ade80', '#ef4444', '#f87171', '#f59e0b',
  '#f97316', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)',
  'transparent', 'inherit', 'currentColor'
];

const COLOR_REGEX = /#[0-9a-fA-F]{3,8}/g;
const CLOUDINARY_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\//;

export class SDUIValidator {
  static validate(json: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!json || typeof json !== 'object') {
      errors.push('SDUI JSON must be a non-null object.');
      return { valid: false, errors };
    }

    // Validate top-level sections array
    if (json.sections && Array.isArray(json.sections)) {
      json.sections.forEach((section: any, i: number) => {
        this.validateSection(section, i, errors);
      });
    } else if (json.id && json.type) {
      // Single section validation
      this.validateSection(json, 0, errors);
    } else {
      errors.push('JSON must have either a "sections" array or a single section with "id" and "type" fields.');
    }

    return { valid: errors.length === 0, errors };
  }

  private static validateSection(section: any, index: number, errors: string[]): void {
    const prefix = `sections[${index}]`;

    // Required fields
    if (!section.id) errors.push(`${prefix}: missing required field "id"`);
    if (!section.type) errors.push(`${prefix}: missing required field "type"`);
    if (typeof section.isVisible !== 'boolean') errors.push(`${prefix}: "isVisible" must be a boolean`);
    if (typeof section.order !== 'number') errors.push(`${prefix}: "order" must be a number`);
    if (!section.label) errors.push(`${prefix}: missing required field "label"`);

    // Color compliance — check string values in the config
    if (section.config) {
      this.validateColors(section.config, `${prefix}.config`, errors);
    }
    if (section.style) {
      this.validateColors(section.style, `${prefix}.style`, errors);
    }

    // Image URL compliance
    if (section.config?.backgroundImage && typeof section.config.backgroundImage === 'string') {
      if (
        section.config.backgroundImage.startsWith('http') &&
        !CLOUDINARY_URL_PATTERN.test(section.config.backgroundImage)
      ) {
        errors.push(`${prefix}.config.backgroundImage: image URLs must be from Cloudinary CDN`);
      }
    }
  }

  private static validateColors(obj: any, path: string, errors: string[]): void {
    if (typeof obj === 'string') {
      const matches = obj.match(COLOR_REGEX);
      if (matches) {
        matches.forEach(color => {
          const normalized = color.toLowerCase();
          const approved = APPROVED_COLORS.some(c => c.toLowerCase() === normalized);
          if (!approved) {
            errors.push(`${path}: unauthorized color "${color}". Use only the Olive Pizza brand palette.`);
          }
        });
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => this.validateColors(item, `${path}[${i}]`, errors));
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([k, v]) => this.validateColors(v, `${path}.${k}`, errors));
    }
  }

  /**
   * Deep clean undefined values to prevent Firestore crashes.
   */
  static cleanUndefined(obj: any): any {
    if (Array.isArray(obj)) return obj.map(v => this.cleanUndefined(v)).filter(v => v !== undefined);
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, this.cleanUndefined(v)])
      );
    }
    return obj;
  }
}

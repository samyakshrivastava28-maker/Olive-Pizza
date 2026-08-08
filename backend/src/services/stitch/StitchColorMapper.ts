/**
 * Strict Brand Color & Design System Enforcement for Google Stitch Imports.
 * 
 * Olive Pizza Brand Colors (Extracted from frontend/src/index.css):
 * Primary: #55775a (Olive Green)
 * Secondary: #f97316 (Pizza Orange)
 * Accent: #f59e0b (Premium Gold)
 * Dark/Background: #0a0a0a, #121212, #1e1e1e
 * Success: #4ade80
 * Error: #f87171
 */

const OLIVE_PIZZA_COLORS = {
  primary: '#55775a',
  primaryLight: '#9eb8a1',
  primaryDark: '#2c3d31',
  secondary: '#f97316',
  secondaryLight: '#fb923c',
  accent: '#f59e0b',
  bgDark: '#0a0a0a',
  bgSurface: '#121212',
  bgCard: '#1e1e1e',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af', // gray-400 equivalent for muted text
  success: '#4ade80',
  error: '#f87171',
};

// Common unauthorized colors that AIs or Stitch might generate
const UNAUTHORIZED_COLOR_MAPPINGS: Record<string, string> = {
  // Blues -> Primary or Secondary depending on context
  'blue': OLIVE_PIZZA_COLORS.primary,
  '#2563eb': OLIVE_PIZZA_COLORS.primary,
  '#3b82f6': OLIVE_PIZZA_COLORS.primaryLight,
  '#1d4ed8': OLIVE_PIZZA_COLORS.primaryDark,
  
  // Purples -> Accent
  'purple': OLIVE_PIZZA_COLORS.accent,
  '#9333ea': OLIVE_PIZZA_COLORS.accent,
  '#a855f7': OLIVE_PIZZA_COLORS.accent,
  
  // Pinks -> Secondary
  'pink': OLIVE_PIZZA_COLORS.secondary,
  '#ec4899': OLIVE_PIZZA_COLORS.secondary,
  
  // Bright Greens -> Primary
  'green': OLIVE_PIZZA_COLORS.primary,
  '#22c55e': OLIVE_PIZZA_COLORS.primary,
  '#16a34a': OLIVE_PIZZA_COLORS.primaryDark,
  
  // Cyans -> Primary Light
  'cyan': OLIVE_PIZZA_COLORS.primaryLight,
  '#06b6d4': OLIVE_PIZZA_COLORS.primaryLight,
};

export class StitchColorMapper {
  static mapToOlivePizzaPalette(stitchLayout: any): any {
    return {
      primary: OLIVE_PIZZA_COLORS.primary,
      secondary: OLIVE_PIZZA_COLORS.secondary,
      accent: OLIVE_PIZZA_COLORS.accent,
      ...this.enforceBrandColors(stitchLayout),
    };
  }

  /**
   * Recursively traverses a Google Stitch AST/JSON object and enforces Olive Pizza colors.
   */
  static enforceBrandColors(stitchLayout: any): any {
    if (!stitchLayout) return stitchLayout;
    
    // Deep clone to avoid mutating original
    const layout = JSON.parse(JSON.stringify(stitchLayout));
    
    this.traverseAndReplace(layout);
    
    return layout;
  }
  
  private static traverseAndReplace(node: any) {
    if (typeof node !== 'object' || node === null) return;
    
    // Process current node's styles/props if they exist
    if (node.style) {
      this.replaceColorValues(node.style);
    }
    if (node.props) {
      this.replaceColorValues(node.props);
    }
    if (node.className) {
      node.className = this.replaceTailwindClasses(node.className);
    }
    
    // Traverse arrays
    if (Array.isArray(node)) {
      node.forEach(child => this.traverseAndReplace(child));
    } else {
      // Traverse object keys
      Object.keys(node).forEach(key => {
        if (typeof node[key] === 'object') {
          this.traverseAndReplace(node[key]);
        }
      });
    }
  }
  
  private static replaceColorValues(obj: Record<string, any>) {
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (typeof val === 'string') {
        const lowerVal = val.toLowerCase();
        // Check exact matches
        if (UNAUTHORIZED_COLOR_MAPPINGS[lowerVal]) {
          obj[key] = UNAUTHORIZED_COLOR_MAPPINGS[lowerVal];
        } else if (lowerVal.startsWith('#')) {
          // If it's a random hex color that isn't white/black/gray, snap it to our brand
          if (!this.isNeutralColor(lowerVal) && !this.isApprovedColor(lowerVal)) {
            // Rough heuristic: if it's not approved, fallback to primary
            // In a more advanced implementation, we'd calculate color distance
            obj[key] = OLIVE_PIZZA_COLORS.primary;
          }
        }
      }
    });
  }
  
  private static replaceTailwindClasses(className: string): string {
    if (!className) return className;
    
    const classes = className.split(' ');
    const newClasses = classes.map(cls => {
      // Replace unauthorized tailwind text colors
      if (cls.startsWith('text-blue-') || cls.startsWith('text-purple-') || cls.startsWith('text-pink-')) {
        return 'text-primary-400';
      }
      if (cls.startsWith('text-green-') || cls.startsWith('text-cyan-')) {
        return 'text-primary-500';
      }
      
      // Replace unauthorized bg colors
      if (cls.startsWith('bg-blue-') || cls.startsWith('bg-purple-') || cls.startsWith('bg-pink-')) {
        return 'bg-primary-500';
      }
      if (cls.startsWith('bg-green-') || cls.startsWith('bg-cyan-')) {
        return 'bg-primary-600';
      }
      
      return cls;
    });
    
    return newClasses.join(' ');
  }
  
  private static isNeutralColor(hex: string): boolean {
    const neutrals = ['#ffffff', '#000000', '#111111', '#222222', '#333333', '#444444', '#eeeeee', '#dddddd', '#cccccc', 'white', 'black', 'transparent'];
    return neutrals.includes(hex);
  }
  
  private static isApprovedColor(hex: string): boolean {
    return Object.values(OLIVE_PIZZA_COLORS).map(c => c.toLowerCase()).includes(hex.toLowerCase());
  }
}

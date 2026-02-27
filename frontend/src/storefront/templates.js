/* ── Template Definitions ──
   Each template is a collection of design tokens, component styles, and layout preferences.
   Shop owners choose a template then customize via design_tokens overrides.
   Templates NEVER change backend behavior — only visual presentation.
*/

export const templates = {
  classic: {
    id: 'classic',
    name: 'Classic Store',
    description: 'Clean, traditional e-commerce layout with a white background and blue accents.',
    preview: '/templates/classic.svg',
    defaults: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#3b82f6',
      bg: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',
      radius: '8px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      headerBg: '#ffffff',
      headerText: '#1e293b',
      footerBg: '#1e293b',
      footerText: '#e2e8f0',
      heroGradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      cardShadow: '0 1px 3px rgba(0,0,0,0.1)',
      buttonRadius: '8px',
    },
  },

  modern_luxe: {
    id: 'modern_luxe',
    name: 'Modern Luxe',
    description: 'Elegant dark theme with gold accents. Perfect for premium brands.',
    preview: '/templates/modern-luxe.svg',
    defaults: {
      primary: '#e3b341',
      secondary: '#d4a017',
      accent: '#f5d060',
      bg: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3',
      border: '#262626',
      radius: '4px',
      fontFamily: "'Playfair Display', Georgia, serif",
      headerBg: '#0a0a0a',
      headerText: '#fafafa',
      footerBg: '#0a0a0a',
      footerText: '#a3a3a3',
      heroGradient: 'linear-gradient(135deg, #171717 0%, #0a0a0a 100%)',
      cardShadow: '0 2px 8px rgba(0,0,0,0.4)',
      buttonRadius: '2px',
    },
  },

  fresh_organic: {
    id: 'fresh_organic',
    name: 'Fresh & Organic',
    description: 'Nature-inspired green palette with warm tones. Great for food, health, and eco brands.',
    preview: '/templates/fresh-organic.svg',
    defaults: {
      primary: '#16a34a',
      secondary: '#15803d',
      accent: '#22c55e',
      bg: '#fefdf8',
      surface: '#f7f5ee',
      text: '#1a2e1a',
      textMuted: '#6b7c6b',
      border: '#d4d0c4',
      radius: '12px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      headerBg: '#fefdf8',
      headerText: '#1a2e1a',
      footerBg: '#1a2e1a',
      footerText: '#d4d0c4',
      heroGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      cardShadow: '0 2px 6px rgba(22,163,74,0.08)',
      buttonRadius: '999px',
    },
  },

  bold_pop: {
    id: 'bold_pop',
    name: 'Bold & Pop',
    description: 'Vibrant, colorful design with playful gradients. Perfect for trendy brands.',
    preview: '/templates/bold-pop.svg',
    defaults: {
      primary: '#e11d48',
      secondary: '#9333ea',
      accent: '#f59e0b',
      bg: '#ffffff',
      surface: '#fdf2f8',
      text: '#1f2937',
      textMuted: '#6b7280',
      border: '#f3e8ff',
      radius: '16px',
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      headerBg: '#ffffff',
      headerText: '#1f2937',
      footerBg: '#1f2937',
      footerText: '#d1d5db',
      heroGradient: 'linear-gradient(135deg, #e11d48 0%, #9333ea 50%, #f59e0b 100%)',
      cardShadow: '0 4px 14px rgba(225,29,72,0.12)',
      buttonRadius: '999px',
    },
  },

  minimal_mono: {
    id: 'minimal_mono',
    name: 'Minimal Mono',
    description: 'Ultra-clean monochrome design. Content speaks for itself.',
    preview: '/templates/minimal-mono.svg',
    defaults: {
      primary: '#171717',
      secondary: '#404040',
      accent: '#737373',
      bg: '#ffffff',
      surface: '#fafafa',
      text: '#171717',
      textMuted: '#737373',
      border: '#e5e5e5',
      radius: '0px',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      headerBg: '#ffffff',
      headerText: '#171717',
      footerBg: '#171717',
      footerText: '#a3a3a3',
      heroGradient: 'linear-gradient(135deg, #171717 0%, #404040 100%)',
      cardShadow: 'none',
      buttonRadius: '0px',
    },
  },
};

/**
 * Resolve final tokens: template defaults merged with shop-level overrides
 * from website_settings.design_tokens. Shop owners can override any token
 * but cannot alter backend API contracts.
 */
export function resolveTokens(templateId, overrides = {}) {
  const tmpl = templates[templateId] || templates.classic;
  return { ...tmpl.defaults, ...overrides };
}

/**
 * Generate CSS custom properties string from merged tokens.
 */
export function tokensToCssVars(tokens) {
  return Object.entries(tokens)
    .map(([key, value]) => `--store-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
    .join('\n  ');
}

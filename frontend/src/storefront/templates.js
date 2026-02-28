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
      headingFont: "'Inter', system-ui, -apple-system, sans-serif",
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
      headingFont: "'Playfair Display', Georgia, serif",
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
      headingFont: "'Poppins', system-ui, sans-serif",
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
      headingFont: "'Space Grotesk', system-ui, sans-serif",
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
      headingFont: "'IBM Plex Sans', system-ui, sans-serif",
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
// DB default is 'starter' — alias it to 'classic'
const templateAliases = { starter: 'classic' };

export function resolveTokens(templateId, overrides = {}) {
  const id = templateAliases[templateId] || templateId;
  const tmpl = templates[id] || templates.classic;
  return { ...tmpl.defaults, ...overrides };
}

export function getTemplate(templateId) {
  const id = templateAliases[templateId] || templateId;
  return templates[id] || templates.classic;
}

/**
 * Generate CSS custom properties string from merged tokens.
 */
export function tokensToCssVars(tokens) {
  return Object.entries(tokens)
    .map(([key, value]) => `--store-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
    .join('\n  ');
}

/* ── Font Pairings ── */
export const fontPairings = [
  { id: 'inter', name: 'Inter (Clean)', body: "'Inter', system-ui, sans-serif", heading: "'Inter', system-ui, sans-serif", google: 'Inter:wght@400;500;600;700' },
  { id: 'playfair_inter', name: 'Playfair + Inter', body: "'Inter', system-ui, sans-serif", heading: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:wght@400;600;700|Inter:wght@400;500;600' },
  { id: 'poppins', name: 'Poppins (Modern)', body: "'Poppins', system-ui, sans-serif", heading: "'Poppins', system-ui, sans-serif", google: 'Poppins:wght@400;500;600;700' },
  { id: 'dm_sans_poppins', name: 'DM Sans + Poppins', body: "'DM Sans', system-ui, sans-serif", heading: "'Poppins', system-ui, sans-serif", google: 'DM+Sans:wght@400;500;700|Poppins:wght@500;600;700' },
  { id: 'space_grotesk', name: 'Space Grotesk (Bold)', body: "'Space Grotesk', system-ui, sans-serif", heading: "'Space Grotesk', system-ui, sans-serif", google: 'Space+Grotesk:wght@400;500;600;700' },
  { id: 'ibm_plex', name: 'IBM Plex (Corporate)', body: "'IBM Plex Sans', system-ui, sans-serif", heading: "'IBM Plex Sans', system-ui, sans-serif", google: 'IBM+Plex+Sans:wght@400;500;600;700' },
  { id: 'lora_nunito', name: 'Lora + Nunito', body: "'Nunito', system-ui, sans-serif", heading: "'Lora', Georgia, serif", google: 'Lora:wght@400;600;700|Nunito:wght@400;500;600;700' },
  { id: 'raleway_open', name: 'Raleway + Open Sans', body: "'Open Sans', system-ui, sans-serif", heading: "'Raleway', system-ui, sans-serif", google: 'Raleway:wght@400;500;600;700|Open+Sans:wght@400;500;600' },
  { id: 'montserrat', name: 'Montserrat (Geometric)', body: "'Montserrat', system-ui, sans-serif", heading: "'Montserrat', system-ui, sans-serif", google: 'Montserrat:wght@400;500;600;700' },
  { id: 'josefin_roboto', name: 'Josefin + Roboto', body: "'Roboto', system-ui, sans-serif", heading: "'Josefin Sans', system-ui, sans-serif", google: 'Josefin+Sans:wght@400;600;700|Roboto:wght@400;500;700' },
];

export function getGoogleFontsUrl(tokens) {
  const families = new Set();
  const body = tokens.fontFamily || '';
  const heading = tokens.headingFont || '';
  const extract = (f) => { const m = f.match(/^'([^']+)'/); return m ? m[1] : null; };
  const bName = extract(body);
  const hName = extract(heading);
  if (bName && !bName.includes('system-ui')) families.add(bName.replace(/ /g, '+') + ':wght@400;500;600;700');
  if (hName && hName !== bName && !hName.includes('system-ui')) families.add(hName.replace(/ /g, '+') + ':wght@400;600;700');
  if (families.size === 0) return null;
  return `https://fonts.googleapis.com/css2?${[...families].map(f => `family=${f}`).join('&')}&display=swap`;
}

/* ── Color Scheme Presets ── */
export const colorPresets = {
  classic: [
    { name: 'Ocean Blue', primary: '#2563eb', secondary: '#1e40af', bg: '#ffffff', surface: '#f8fafc', text: '#1e293b', accent: '#3b82f6' },
    { name: 'Forest', primary: '#059669', secondary: '#047857', bg: '#ffffff', surface: '#f0fdf4', text: '#1e293b', accent: '#34d399' },
    { name: 'Coral', primary: '#f43f5e', secondary: '#e11d48', bg: '#ffffff', surface: '#fff1f2', text: '#1e293b', accent: '#fb7185' },
    { name: 'Purple Rain', primary: '#7c3aed', secondary: '#6d28d9', bg: '#ffffff', surface: '#f5f3ff', text: '#1e293b', accent: '#a78bfa' },
    { name: 'Amber Glow', primary: '#d97706', secondary: '#b45309', bg: '#ffffff', surface: '#fffbeb', text: '#1e293b', accent: '#fbbf24' },
    { name: 'Slate Pro', primary: '#475569', secondary: '#334155', bg: '#ffffff', surface: '#f8fafc', text: '#0f172a', accent: '#94a3b8' },
  ],
  modern_luxe: [
    { name: 'Gold Classic', primary: '#e3b341', secondary: '#d4a017', bg: '#0a0a0a', surface: '#171717', text: '#fafafa', accent: '#f5d060' },
    { name: 'Rose Gold', primary: '#f4a0a0', secondary: '#d97070', bg: '#0a0a0a', surface: '#171717', text: '#fafafa', accent: '#fbbfbf' },
    { name: 'Silver', primary: '#c0c0c0', secondary: '#a0a0a0', bg: '#0a0a0a', surface: '#1a1a1a', text: '#f5f5f5', accent: '#e0e0e0' },
    { name: 'Emerald Night', primary: '#34d399', secondary: '#10b981', bg: '#0a0a0a', surface: '#171717', text: '#fafafa', accent: '#6ee7b7' },
    { name: 'Royal Purple', primary: '#a78bfa', secondary: '#8b5cf6', bg: '#0f0a1a', surface: '#1a1525', text: '#fafafa', accent: '#c4b5fd' },
  ],
  fresh_organic: [
    { name: 'Spring Green', primary: '#16a34a', secondary: '#15803d', bg: '#fefdf8', surface: '#f7f5ee', text: '#1a2e1a', accent: '#22c55e' },
    { name: 'Earth Tone', primary: '#92400e', secondary: '#78350f', bg: '#fefdf8', surface: '#f5f0e6', text: '#292524', accent: '#d97706' },
    { name: 'Berry Farm', primary: '#be185d', secondary: '#9d174d', bg: '#fef9fa', surface: '#fdf2f8', text: '#292524', accent: '#f472b6' },
    { name: 'Ocean Mist', primary: '#0891b2', secondary: '#0e7490', bg: '#f8fffe', surface: '#ecfeff', text: '#1a2e2e', accent: '#22d3ee' },
  ],
  bold_pop: [
    { name: 'Sunset', primary: '#e11d48', secondary: '#9333ea', bg: '#ffffff', surface: '#fdf2f8', text: '#1f2937', accent: '#f59e0b' },
    { name: 'Electric', primary: '#06b6d4', secondary: '#8b5cf6', bg: '#ffffff', surface: '#f0fdfa', text: '#1f2937', accent: '#f43f5e' },
    { name: 'Neon', primary: '#22c55e', secondary: '#3b82f6', bg: '#ffffff', surface: '#f0fdf4', text: '#1f2937', accent: '#eab308' },
    { name: 'Candy', primary: '#ec4899', secondary: '#f59e0b', bg: '#ffffff', surface: '#fdf2f8', text: '#1f2937', accent: '#a855f7' },
  ],
  minimal_mono: [
    { name: 'True Black', primary: '#171717', secondary: '#404040', bg: '#ffffff', surface: '#fafafa', text: '#171717', accent: '#737373' },
    { name: 'Warm Gray', primary: '#44403c', secondary: '#57534e', bg: '#fafaf9', surface: '#f5f5f4', text: '#1c1917', accent: '#a8a29e' },
    { name: 'Cool Blue', primary: '#334155', secondary: '#475569', bg: '#ffffff', surface: '#f8fafc', text: '#0f172a', accent: '#94a3b8' },
  ],
};

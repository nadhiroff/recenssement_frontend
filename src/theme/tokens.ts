export const clair = {
  primary: '#1F6B4F',
  secondary: '#C2662D',
  accent: '#D9A520',
  background: '#FAF6EF',
  surface: '#FFFFFF',
  text: '#1E2420',
  muted: '#646D67',
  bordure: '#E3DCCF',
  surPrimary: '#FFFFFF',
  success: '#2E8B57',
  warning: '#D98E04',
  danger: '#B3261E',
  info: '#2F6FB0',
  private: '#6E5A8A',
};

export type Couleurs = typeof clair;

export const sombre: Couleurs = {
  primary: '#3FA37C',
  secondary: '#E08A50',
  accent: '#E8BE4A',
  background: '#121614',
  surface: '#1C2320',
  text: '#ECEFEA',
  muted: '#9AA39D',
  bordure: '#303A35',
  surPrimary: '#0E1311',
  success: '#2E8B57',
  warning: '#D98E04',
  danger: '#E5736B',
  info: '#6FA6DC',
  private: '#A893C4',
};

export const espace = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };
export const rayon = { m: 14, l: 16 };
export const DUREE = { courte: 150, normale: 250, max: 300 };

export type StatutLien = 'declare' | 'confirme' | 'valide' | 'en_examen' | 'prive' | 'rejete';

export const couleurStatut = (c: Couleurs, s: StatutLien): string =>
  ({
    declare: c.warning,
    confirme: c.warning,
    valide: c.success,
    en_examen: c.info,
    prive: c.private,
    rejete: c.danger,
  })[s];

/** Rapport de contraste WCAG entre deux couleurs #RRGGBB. */
export function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

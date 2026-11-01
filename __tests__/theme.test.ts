import fr from '@/i18n/fr.json';
import { clair, contraste, couleurStatut, sombre } from '@/theme/tokens';

describe('contrastes WCAG AA', () => {
  it.each([
    ['clair', clair],
    ['sombre', sombre],
  ])('thème %s', (_, c) => {
    for (const [texte, fond] of [
      [c.text, c.background],
      [c.text, c.surface],
      [c.muted, c.background],
      [c.muted, c.surface],
      [c.primary, c.background],
      [c.surPrimary, c.primary],
      [c.danger, c.background],
    ]) {
      expect(contraste(texte, fond)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('statuts', () => {
  it.each([
    ['clair', clair],
    ['sombre', sombre],
  ])('chaque statut a sa propre couleur, thème %s', (_, c) => {
    const statuts = ['declare', 'confirme', 'valide', 'en_examen', 'prive', 'rejete'] as const;
    expect(new Set(statuts.map((s) => couleurStatut(c, s))).size).toBe(statuts.length);
  });
});

describe('i18n', () => {
  it('fr.json contient les libellés des statuts', () => {
    expect(Object.keys(fr.statuts)).toHaveLength(6);
  });
});

import { normaliserTelephone, telephoneValide } from '@/lib/telephone';

describe('téléphone', () => {
  it('accepte le format béninois à 10 chiffres', () => {
    expect(normaliserTelephone('+229 01 97 12 34 56')).toBe('+2290197123456');
    expect(telephoneValide('+2290197123456')).toBe(true);
  });
  it('complète un ancien numéro à 8 chiffres', () => {
    expect(normaliserTelephone('+22997123456')).toBe('+2290197123456');
  });
  it('refuse un numéro béninois mal formé, accepte les autres pays', () => {
    expect(telephoneValide('+2290297123456')).toBe(false);
    expect(telephoneValide('+22890123456')).toBe(true);
    expect(telephoneValide('22997123456')).toBe(false);
  });
});

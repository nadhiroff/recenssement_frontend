import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Bouton, Carte, Muet, T, useRebond } from '@/components/ui';
import { t } from '@/i18n';
import type { Personne } from '@/lib/auth';
import { vibrerSucces } from '@/lib/retour';
import { DUREE, espace } from '@/theme/tokens';

export type Candidat = { anonyme: true } | { personne: Personne; score: number; filiation: string | null };

export function decrire(p: Personne): string {
  const autres = p.noms.filter((n) => !['nom_famille', 'naissance'].includes(n.type)).map((n) => n.valeur);
  const annee = p.annee_naissance
    ? p.precision_naissance === 'exacte' ? String(p.annee_naissance) : `vers ${p.annee_naissance}`
    : '';
  return [annee, ...autres].filter(Boolean).join(' · ');
}

export function CarteCandidat({ candidat, rang, onChoisir }: { candidat: Candidat; rang: number; onChoisir: () => void }) {
  const { style, rebondir } = useRebond();
  const entree = FadeInDown.delay(rang * 60).duration(DUREE.normale).reduceMotion(ReduceMotion.System);

  if ('anonyme' in candidat) {
    return (
      <Animated.View entering={entree}>
        <Carte>
          <Muet>{t('inscription.ficheReservee')}</Muet>
        </Carte>
      </Animated.View>
    );
  }
  const { personne: p, filiation } = candidat;
  return (
    <Animated.View entering={entree} style={style}>
      <Carte>
        <Pressable accessibilityRole="button" onPress={onChoisir}>
          <T gras>{p.nom_complet}</T>
          {decrire(p) ? <Muet v="petit">{decrire(p)}</Muet> : null}
          {filiation ? <Muet v="petit">{filiation}</Muet> : null}
        </Pressable>
        <View style={styles.action}>
          <Bouton
            testID={`choisir-${p.id}`}
            variante="contour"
            titre={p.sexe === 'F' ? t('inscription.cestElle') : t('inscription.cestLui')}
            onPress={() => {
              rebondir();
              vibrerSucces();
              onChoisir();
            }}
          />
        </View>
      </Carte>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ action: { marginTop: espace.xs } });

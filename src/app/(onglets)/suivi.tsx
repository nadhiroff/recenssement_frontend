import { useQuery } from '@tanstack/react-query';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Ecran } from '@/components/Ecran';
import { Carte, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import type { StatBranche } from '@/lib/types';
import { useTheme } from '@/theme';
import { couleurStatut, espace, type StatutLien } from '@/theme/tokens';

const ORDRE: StatutLien[] = ['valide', 'confirme', 'declare', 'en_examen', 'prive', 'rejete'];

/** Barre empilée sobre : les chiffres de la légende portent la valeur, la couleur seule ne dit rien. */
const CarteBranche = memo(function CarteBranche({ b }: { b: StatBranche }) {
  const { c } = useTheme();
  const total = ORDRE.reduce((s, k) => s + b.liens[k], 0);
  return (
    <Carte>
      <T v="sousTitre">{b.nom}</T>
      <Muet>{`${t('suivi.fiches', { n: b.personnes })} · ${t('suivi.liens', { n: total })} · ${t('suivi.doublons', { n: b.doublons })}`}</Muet>
      {total > 0 ? (
        <View style={styles.barre} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {ORDRE.filter((k) => b.liens[k] > 0).map((k) => (
            <View key={k} style={{ flex: b.liens[k], backgroundColor: couleurStatut(c, k) }} />
          ))}
        </View>
      ) : null}
      <View style={styles.legende}>
        {ORDRE.map((k) => (
          <View key={k} style={styles.ligne}>
            <View style={[styles.point, { backgroundColor: couleurStatut(c, k) }]} />
            <T v="petit" style={styles.libelle}>{t(`statuts.${k}`)}</T>
            <T v="petit" gras>{b.liens[k]}</T>
          </View>
        ))}
      </View>
    </Carte>
  );
});

export default function Suivi() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api<StatBranche[]>('GET', '/stats') });
  return (
    <Ecran>
      <T v="titre">{t('suivi.titre')}</T>
      {stats.isPending ? <Squelette hauteur={180} /> : null}
      <Erreur>{stats.error?.message}</Erreur>
      {stats.data?.map((b) => <CarteBranche key={b.branche_id} b={b} />)}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  barre: { flexDirection: 'row', height: 12, gap: 2, borderRadius: 4, overflow: 'hidden' },
  legende: { gap: 2 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  point: { width: 10, height: 10, borderRadius: 5 },
  libelle: { flex: 1 },
});

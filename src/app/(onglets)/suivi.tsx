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

type ActionJournal = { id: number; action: string; entite_type: string | null; entite_id: number | null; cree_le: string };

const libelleAction = (action: string) => {
  const cle = `suivi.actions.${action.replace('.', '_')}`;
  const texte = t(cle);
  return texte === cle ? action : texte;
};

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
  const journal = useQuery({ queryKey: ['journal'], queryFn: () => api<ActionJournal[]>('GET', '/journal?per_page=30') });
  return (
    <Ecran>
      <T v="titre">{t('suivi.titre')}</T>
      {stats.isPending ? <Squelette hauteur={180} /> : null}
      <Erreur>{stats.error?.message}</Erreur>
      {stats.data?.map((b) => <CarteBranche key={b.branche_id} b={b} />)}
      <T v="sousTitre">{t('suivi.journal')}</T>
      <Carte>
        {journal.isPending ? <Squelette hauteur={96} /> : null}
        <Erreur>{journal.error?.message}</Erreur>
        {journal.data?.length === 0 ? <Muet>{t('suivi.journalVide')}</Muet> : null}
        {journal.data?.map((j) => (
          <View key={j.id} style={styles.action}>
            <T v="petit" gras>{libelleAction(j.action)}</T>
            <Muet v="petit">{`${j.cree_le.slice(0, 16)} · ${j.entite_type ?? ''} ${j.entite_id ?? ''}`}</Muet>
          </View>
        ))}
      </Carte>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  barre: { flexDirection: 'row', height: 12, gap: 2, borderRadius: 4, overflow: 'hidden' },
  legende: { gap: 2 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  point: { width: 10, height: 10, borderRadius: 5 },
  libelle: { flex: 1 },
  action: { paddingVertical: 2 },
});

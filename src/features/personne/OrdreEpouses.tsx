import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { Carte, Erreur, Muet, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import type { Personne } from '@/lib/auth';
import { vibrerSucces } from '@/lib/retour';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

type Epouse = { union_id: number; rang_epouse: number; personne: Personne };

/** Le serveur décide des droits : un conflit d'intérêts revient ici comme un message. */
export function OrdreEpouses({ epouxId }: { epouxId: number }) {
  const { c } = useTheme();
  const client = useQueryClient();
  const epouses = useQuery({ queryKey: ['epouses', epouxId], queryFn: () => api<Epouse[]>('GET', `/personnes/${epouxId}/epouses`) });
  const liste = epouses.data ?? [];
  const ordonner = useMutation({
    mutationFn: (ordre: number[]) => api('POST', `/personnes/${epouxId}/epouses/ordre`, { ordre }),
    onSuccess: () => {
      vibrerSucces();
      client.invalidateQueries({ queryKey: ['epouses', epouxId] });
      client.invalidateQueries({ queryKey: ['arbre'] });
      client.invalidateQueries({ queryKey: ['famille', epouxId] });
    },
  });
  if (liste.length < 2) return null;

  const deplacer = (i: number, vers: number) => {
    const ids = liste.map((e) => e.union_id);
    [ids[i], ids[vers]] = [ids[vers], ids[i]];
    ordonner.mutate(ids);
  };
  const Fleche = ({ libelle, signe, onPress }: { libelle: string; signe: string; onPress: () => void }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelle}
      disabled={ordonner.isPending}
      onPress={onPress}
      style={[styles.fleche, { borderColor: c.primary }]}>
      <T gras couleur={c.primary}>{signe}</T>
    </Pressable>
  );

  return (
    <Carte>
      <T v="sousTitre">{t('personne.ordreEpouses')}</T>
      <Muet v="petit">{t('personne.ordreAide')}</Muet>
      {liste.map((e, i) => (
        <View key={e.union_id} style={[styles.ligne, { borderBottomColor: c.bordure }]}>
          <View style={styles.flex}>
            <Muet v="petit">{i === 0 ? t('arbre.premiere') : t('arbre.rang', { n: i + 1 })}</Muet>
            <T>{e.personne.nom_complet}</T>
          </View>
          {i > 0 ? <Fleche libelle={t('personne.monter')} signe="↑" onPress={() => deplacer(i, i - 1)} /> : null}
          {i < liste.length - 1 ? <Fleche libelle={t('personne.descendre')} signe="↓" onPress={() => deplacer(i, i + 1)} /> : null}
        </View>
      ))}
      <Erreur>{ordonner.error?.message}</Erreur>
    </Carte>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.s, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  fleche: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

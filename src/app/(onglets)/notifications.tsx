import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton, Carte, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { activerAlertes, useEtatAlertes } from '@/lib/alertes';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import type { Notification } from '@/lib/types';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

const POUR_REFERENT = ['a_traiter', 'orientation'];

function ActiverAlertes() {
  const { etat, actualiser } = useEtatAlertes();
  if (etat === 'accordees' || etat === 'indisponibles') return null;
  return (
    <Carte>
      <T gras>{t('notifications.activerTitre')}</T>
      <Muet>{t(etat === 'refusees' ? 'notifications.activerRefuse' : 'notifications.activerTexte')}</Muet>
      <Bouton
        variante="contour"
        titre={t(etat === 'refusees' ? 'notifications.ouvrirReglages' : 'notifications.activer')}
        onPress={() => (etat === 'refusees' ? void Linking.openSettings() : void activerAlertes().then(actualiser))}
      />
    </Carte>
  );
}

export default function Notifications() {
  const { c } = useTheme();
  const haut = useSafeAreaInsets().top;
  const client = useQueryClient();
  const { recharger } = useSession();
  const liste = useQuery({ queryKey: ['notifications'], queryFn: () => api<Notification[]>('GET', '/notifications') });
  const apres = () => {
    client.invalidateQueries({ queryKey: ['notifications'] });
    void recharger();
  };
  const lue = useMutation({ mutationFn: (id: number) => api('POST', `/notifications/${id}/lu`, {}), onSuccess: apres });
  const toutLu = useMutation({ mutationFn: () => api('POST', '/notifications/lu', {}), onSuccess: apres });
  const nonLues = (liste.data ?? []).filter((n) => !n.lu_le).length;

  const ouvrir = (n: Notification) => {
    if (!n.lu_le) lue.mutate(n.id);
    if (n.lien_id && POUR_REFERENT.includes(n.type)) router.push(`/lien/${n.lien_id}`);
    else if (n.type === 'revendication') router.push('/referent');
    else if (n.lien_id) router.push('/liens');
  };

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.liste, { paddingTop: haut + espace.m }]}
      data={liste.data ?? []}
      keyExtractor={(n) => String(n.id)}
      refreshing={liste.isRefetching}
      onRefresh={() => {
        void liste.refetch();
        void recharger();
      }}
      ListHeaderComponent={
        <View style={styles.entete}>
          <T v="titre">{t('notifications.titre')}</T>
          <ActiverAlertes />
          {nonLues > 0 ? (
            <Bouton testID="tout-lu" variante="texte" titre={t('notifications.toutLu', { n: nonLues })} chargement={toutLu.isPending} onPress={() => toutLu.mutate()} />
          ) : null}
          {liste.isPending ? <Squelette /> : null}
          <Erreur>{liste.error?.message ?? toutLu.error?.message}</Erreur>
        </View>
      }
      ListEmptyComponent={liste.isPending ? undefined : <Muet>{t('notifications.vide')}</Muet>}
      renderItem={({ item }) => (
        <Pressable testID={`alerte-${item.id}`} accessibilityRole="button" accessibilityState={{ selected: !item.lu_le }} onPress={() => ouvrir(item)}>
          <Carte style={!item.lu_le ? { borderColor: c.secondary, borderWidth: 1.5 } : undefined}>
            <View style={styles.ligne}>
              {!item.lu_le ? <View style={[styles.point, { backgroundColor: c.secondary }]} /> : null}
              <T gras={!item.lu_le} style={styles.flex}>{item.message}</T>
            </View>
            <Muet v="petit">{item.created_at.slice(0, 16).replace('T', ' ')}</Muet>
          </Carte>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  liste: { padding: espace.m, gap: espace.m },
  entete: { gap: espace.s },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  point: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
});

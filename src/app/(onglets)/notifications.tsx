import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton, Carte, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { activerAlertes, retirerAlertesDuTelephone, useEtatAlertes } from '@/lib/alertes';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import type { Notification } from '@/lib/types';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

const POUR_REFERENT = ['a_traiter', 'orientation'];
const DUREE_ALERTE_MS = 6000;

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
  const [vues, setVues] = useState<Notification[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string>();

  // Ouvrir l'écran vaut lecture : les alertes restent à l'écran le temps de la visite, puis disparaissent.
  const lire = useCallback(async () => {
    setChargement(true);
    try {
      const nouvelles = await api<Notification[]>('GET', '/notifications');
      setErreur(undefined);
      setVues((avant) => [...nouvelles, ...avant.filter((a) => !nouvelles.some((n) => n.id === a.id))]);
      if (nouvelles.length > 0) {
        await api('POST', '/notifications/lu', {});
        client.invalidateQueries({ queryKey: ['mes-liens'] });
        void recharger();
      }
      retirerAlertesDuTelephone();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, [client, recharger]);

  useFocusEffect(
    useCallback(() => {
      void lire();
      return () => setVues([]);
    }, [lire])
  );

  // Une alerte vue s'efface d'elle-même au bout de quelques secondes.
  useEffect(() => {
    if (vues.length === 0) return;
    const minuterie = setTimeout(() => setVues([]), DUREE_ALERTE_MS);
    return () => clearTimeout(minuterie);
  }, [vues]);

  const ouvrir = (n: Notification) => {
    setVues((avant) => avant.filter((a) => a.id !== n.id));
    if (n.lien_id && POUR_REFERENT.includes(n.type)) router.push(`/lien/${n.lien_id}`);
    else if (n.type === 'revendication') router.push('/referent');
    else if (n.lien_id) router.push('/liens');
  };

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.liste, { paddingTop: haut + espace.m }]}
      data={vues}
      keyExtractor={(n) => String(n.id)}
      refreshing={chargement && vues.length > 0}
      onRefresh={() => void lire()}
      ListHeaderComponent={
        <View style={styles.entete}>
          <T v="titre">{t('notifications.titre')}</T>
          <ActiverAlertes />
          {chargement && vues.length === 0 ? <Squelette /> : null}
          <Erreur>{erreur}</Erreur>
        </View>
      }
      ListEmptyComponent={chargement ? undefined : <Muet>{t('notifications.vide')}</Muet>}
      renderItem={({ item }) => (
        <Pressable testID={`alerte-${item.id}`} accessibilityRole="button" onPress={() => ouvrir(item)}>
          <Carte style={{ borderColor: c.secondary, borderWidth: 1.5 }}>
            <T gras>{item.message}</T>
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
});

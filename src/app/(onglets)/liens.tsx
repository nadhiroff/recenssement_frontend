import { useMutation, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Bouton, Carte, Champ, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useReseau } from '@/lib/reseau';
import { normaliserTelephone } from '@/lib/telephone';
import type { Lien } from '@/lib/types';
import { useTheme } from '@/theme';
import { DUREE, espace } from '@/theme/tokens';

function ligneLien(l: Lien) {
  return t('liens.entre', {
    parent: l.parent?.nom_complet ?? t('liens.fichePrivee'),
    role: t(`roles.${l.role_parent}`),
    enfant: l.enfant?.nom_complet ?? t('liens.fichePrivee'),
  });
}

function CarteLien({ lien, rang }: { lien: Lien; rang: number }) {
  const [ouvert, setOuvert] = useState(false);
  const [telephone, setTelephone] = useState('');
  const inviter = useMutation({
    mutationFn: () =>
      api<{ whatsapp_url: string }>('POST', `/liens/${lien.id}/invitations`, {
        telephone: normaliserTelephone(telephone) || undefined,
      }),
    onSuccess: ({ whatsapp_url }) => {
      setOuvert(false);
      void Linking.openURL(whatsapp_url);
    },
  });
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(rang, 6) * 40).duration(DUREE.normale).reduceMotion(ReduceMotion.System)}>
      <Carte>
        <T>{ligneLien(lien)}</T>
        <Badge statut={lien.statut} />
        {lien.motif_rejet ? <Muet v="petit">{t('liens.motif', { motif: lien.motif_rejet })}</Muet> : null}
        {lien.statut === 'declare' && ouvert ? (
          <Champ label={t('liens.numero')} keyboardType="phone-pad" value={telephone} onChangeText={setTelephone} />
        ) : null}
        {lien.statut === 'declare' ? (
          <Bouton
            variante="contour"
            titre={t('liens.inviter')}
            chargement={inviter.isPending}
            onPress={() => (ouvert ? inviter.mutate() : setOuvert(true))}
          />
        ) : null}
        <Erreur>{inviter.error?.message}</Erreur>
      </Carte>
    </Animated.View>
  );
}

export default function Liens() {
  const { c } = useTheme();
  const haut = useSafeAreaInsets().top;
  const { enAttente } = useReseau();
  const liens = useQuery({ queryKey: ['mes-liens'], queryFn: () => api<Lien[]>('GET', '/mes-liens') });
  // Un statut peut changer à tout moment : la liste se relit à chaque retour sur l'onglet.
  const { refetch } = liens;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );
  const rendu = useCallback(({ item, index }: { item: Lien; index: number }) => <CarteLien lien={item} rang={index} />, []);
  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.liste, { paddingTop: haut + espace.m }]}
      data={liens.data ?? []}
      keyExtractor={(l) => String(l.id)}
      renderItem={rendu}
      refreshing={liens.isRefetching}
      onRefresh={liens.refetch}
      ListHeaderComponent={
        <View style={styles.entete}>
          <T v="titre">{t('liens.titre')}</T>
          <Muet>{t('liens.aide')}</Muet>
          {enAttente > 0 ? <T gras>{t('liens.enAttenteEnvoi')}</T> : null}
          {liens.isPending ? <Squelette /> : null}
          <Erreur>{liens.error?.message}</Erreur>
        </View>
      }
      ListEmptyComponent={liens.isPending ? undefined : <Muet>{t('liens.vide')}</Muet>}
    />
  );
}

const styles = StyleSheet.create({
  liste: { padding: espace.m, gap: espace.m },
  entete: { gap: espace.s },
});

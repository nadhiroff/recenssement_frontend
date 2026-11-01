import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Carte, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import type { Notification } from '@/lib/types';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

export default function Notifications() {
  const { c } = useTheme();
  const haut = useSafeAreaInsets().top;
  const client = useQueryClient();
  const { recharger } = useSession();
  const liste = useQuery({ queryKey: ['notifications'], queryFn: () => api<Notification[]>('GET', '/notifications') });
  const lue = useMutation({
    mutationFn: (id: number) => api('POST', `/notifications/${id}/lu`, {}),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['notifications'] });
      void recharger();
    },
  });
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.liste, { paddingTop: haut + espace.m }]}
      data={liste.data ?? []}
      keyExtractor={(n) => String(n.id)}
      refreshing={liste.isRefetching}
      onRefresh={liste.refetch}
      ListHeaderComponent={
        <>
          <T v="titre">{t('notifications.titre')}</T>
          {liste.isPending ? <Squelette /> : null}
        </>
      }
      ListEmptyComponent={liste.isPending ? undefined : <Muet>{t('notifications.vide')}</Muet>}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" onPress={() => !item.lu_le && lue.mutate(item.id)}>
          <Carte style={!item.lu_le ? { borderColor: c.secondary, borderWidth: 1.5 } : undefined}>
            <T gras={!item.lu_le}>{item.message}</T>
            <Muet v="petit">{item.created_at.slice(0, 10)}</Muet>
          </Carte>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({ liste: { padding: espace.m, gap: espace.m } });

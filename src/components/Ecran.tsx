import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

export function Ecran({ children, pied, sansDefilement }: { children: ReactNode; pied?: ReactNode; sansDefilement?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.racine, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {sansDefilement ? (
        <View style={styles.contenuFixe}>{children}</View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenu}>
          <View style={styles.limite}>{children}</View>
        </ScrollView>
      )}
      {pied ? (
        <View style={[styles.pied, { paddingBottom: insets.bottom + espace.m, borderTopColor: c.bordure }]}>{pied}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1 },
  contenu: { padding: espace.m, alignItems: 'center' },
  contenuFixe: { flex: 1, padding: espace.m },
  limite: { width: '100%', maxWidth: 560, gap: espace.m },
  pied: { paddingHorizontal: espace.m, paddingTop: espace.m, borderTopWidth: StyleSheet.hairlineWidth, gap: espace.s },
});

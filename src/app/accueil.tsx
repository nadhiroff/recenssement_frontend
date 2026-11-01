import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MotifPagne } from '@/components/MotifPagne';
import { Bouton, Case, Muet, T } from '@/components/ui';
import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

export default function Accueil() {
  const { c, grandTexte, basculerGrandTexte } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.racine, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom + espace.m }]}>
      <MotifPagne />
      <View style={styles.centre}>
        <T v="petit" gras couleur={c.primary}>
          {t('app.famille')}
        </T>
        <T v="titre">{t('accueil.titre')}</T>
        <Muet>{t('accueil.texte')}</Muet>
        <Muet>{t('accueil.sansMotDePasse')}</Muet>
      </View>
      <View style={styles.bas}>
        <Case coche={grandTexte} onChange={basculerGrandTexte}>
          {t('accueil.grandTexte')}
        </Case>
        <Bouton testID="commencer" titre={t('accueil.creer')} onPress={() => router.push({ pathname: '/connexion', params: { mode: 'creation' } })} />
        <Bouton testID="se-connecter" variante="contour" titre={t('accueil.seConnecter')} onPress={() => router.push('/connexion')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, paddingHorizontal: espace.m, alignItems: 'center' },
  centre: { flex: 1, justifyContent: 'center', gap: espace.m, width: '100%', maxWidth: 560 },
  bas: { gap: espace.m, width: '100%', maxWidth: 560 },
});

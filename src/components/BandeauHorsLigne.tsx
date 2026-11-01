import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { t } from '@/i18n';
import { useReseau } from '@/lib/reseau';
import { useTheme } from '@/theme';
import { DUREE, espace } from '@/theme/tokens';

export function BandeauHorsLigne() {
  const { enLigne, enAttente } = useReseau();
  const { c } = useTheme();
  const haut = useSafeAreaInsets().top;
  if (enLigne) return null;
  return (
    <Animated.View
      entering={SlideInUp.duration(DUREE.normale).reduceMotion(ReduceMotion.System)}
      exiting={SlideOutUp.duration(DUREE.normale).reduceMotion(ReduceMotion.System)}
      accessibilityLiveRegion="polite"
      style={[styles.bandeau, { paddingTop: haut + espace.s, backgroundColor: c.text }]}>
      <View>
        <T v="petit" gras couleur={c.background}>
          {t('horsLigne.bandeau')}
        </T>
        {enAttente > 0 ? (
          <T v="petit" couleur={c.background}>
            {t('horsLigne.enAttente', { n: enAttente })}
          </T>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bandeau: { paddingHorizontal: espace.m, paddingBottom: espace.s },
});

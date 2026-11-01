import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { T } from '@/components/ui';
import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { DUREE, espace } from '@/theme/tokens';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;

export function ZoomPan({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const reduit = useReducedMotion();
  const zoom = useSharedValue(1);
  const zoomDepart = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const xDepart = useSharedValue(0);
  const yDepart = useSharedValue(0);

  const pincer = Gesture.Pinch()
    .onStart(() => {
      zoomDepart.value = zoom.value;
    })
    .onUpdate((e) => {
      zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomDepart.value * e.scale));
    });
  const glisser = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      xDepart.value = x.value;
      yDepart.value = y.value;
    })
    .onUpdate((e) => {
      x.value = xDepart.value + e.translationX;
      y.value = yDepart.value + e.translationY;
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: zoom.value }],
  }));

  const anime = (v: { value: number }, cible: number) => {
    v.value = reduit ? cible : withTiming(cible, { duration: DUREE.normale });
  };
  const changerZoom = (facteur: number) => anime(zoom, Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.value * facteur)));
  const recentrer = () => {
    anime(zoom, 1);
    anime(x, 0);
    anime(y, 0);
  };

  return (
    <View style={styles.cadre}>
      <GestureDetector gesture={Gesture.Simultaneous(pincer, glisser)}>
        <View style={styles.zone}>
          <Animated.View style={[styles.origine, style]}>{children}</Animated.View>
        </View>
      </GestureDetector>
      <View style={styles.commandes}>
        {[
          { l: '+', a11y: t('arbre.agrandir'), f: () => changerZoom(1.25) },
          { l: '−', a11y: t('arbre.reduire'), f: () => changerZoom(0.8) },
          { l: '⟲', a11y: t('arbre.recentrer'), f: recentrer },
        ].map((b) => (
          <Pressable key={b.l} accessibilityRole="button" accessibilityLabel={b.a11y} onPress={b.f} style={[styles.commande, { backgroundColor: c.surface, borderColor: c.bordure }]}>
            <T gras>{b.l}</T>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: { flex: 1, overflow: 'hidden' },
  zone: { flex: 1, overflow: 'hidden' },
  origine: { alignSelf: 'flex-start', padding: espace.m, transformOrigin: 'top left' },
  commandes: { position: 'absolute', right: espace.m, bottom: espace.m, gap: espace.s },
  commande: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

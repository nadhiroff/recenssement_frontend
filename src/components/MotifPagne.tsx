import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Filigrane de losanges et chevrons inspiré des pagnes, léger car vectoriel et répété. */
export const MotifPagne = memo(function MotifPagne() {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" opacity={0.07}>
        <Defs>
          <Pattern id="pagne" width={64} height={64} patternUnits="userSpaceOnUse">
            <Path d="M32 4 60 32 32 60 4 32Z" stroke={c.secondary} strokeWidth={2} fill="none" />
            <Path d="M32 18 46 32 32 46 18 32Z" fill={c.primary} />
            <Path d="M0 0 12 12M64 0 52 12M0 64 12 52M64 64 52 52" stroke={c.accent} strokeWidth={3} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#pagne)" />
      </Svg>
    </View>
  );
});

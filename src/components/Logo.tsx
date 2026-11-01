import { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export const Logo = memo(function Logo({ taille = 72 }: { taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 64 64" accessibilityElementsHidden>
      <Rect x={11} y={11} width={42} height={42} rx={9} transform="rotate(45 32 32)" fill="#1F6B4F" stroke="#D9A520" strokeWidth={4} />
      <Path d="M32 16v20m0-7H21v7m11-7h11v7" fill="none" stroke="#FAF6EF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={32} cy={16} r={4} fill="#D9A520" />
      <Circle cx={21} cy={39} r={4} fill="#E08A50" />
      <Circle cx={32} cy={39} r={4} fill="#FAF6EF" />
      <Circle cx={43} cy={39} r={4} fill="#E08A50" />
    </Svg>
  );
});

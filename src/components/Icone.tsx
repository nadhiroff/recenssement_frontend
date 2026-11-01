import { memo } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const TRACES = {
  arbre: 'M12 3v6m0 0H6v5m6-5h6v5M12 9v5M4 14h4v5H4zM10 14h4v5h-4zM16 14h4v5h-4z',
  liens: 'M9 15l6-6M10 6l2-2a4 4 0 0 1 6 6l-2 2M14 18l-2 2a4 4 0 0 1-6-6l2-2',
  notifications: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 21h4',
  fiche: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  referent: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zM9 12l2 2 4-4',
  suivi: 'M5 20V11M12 20V4M19 20v-6',
} as const;

export const Icone = memo(function Icone({ nom, couleur, taille = 24 }: { nom: keyof typeof TRACES; couleur: ColorValue; taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={TRACES[nom]} />
    </Svg>
  );
});

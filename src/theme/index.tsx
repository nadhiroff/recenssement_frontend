import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { clair, type Couleurs, sombre } from './tokens';

type Theme = {
  c: Couleurs;
  sombre: boolean;
  echelle: number;
  grandTexte: boolean;
  basculerGrandTexte: () => void;
};

const Contexte = createContext<Theme | null>(null);
const CLE = 'reglage.grand_texte';

export function ThemeFourni({ children }: { children: ReactNode }) {
  const schema = useColorScheme();
  const [grandTexte, setGrandTexte] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLE).then((v) => setGrandTexte(v === '1'));
  }, []);

  const valeur = useMemo<Theme>(
    () => ({
      c: schema === 'dark' ? sombre : clair,
      sombre: schema === 'dark',
      echelle: grandTexte ? 1.25 : 1,
      grandTexte,
      basculerGrandTexte: () => {
        setGrandTexte((v) => {
          AsyncStorage.setItem(CLE, v ? '0' : '1');
          return !v;
        });
      },
    }),
    [schema, grandTexte]
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useTheme(): Theme {
  const v = useContext(Contexte);
  if (!v) throw new Error('ThemeFourni manquant');
  return v;
}

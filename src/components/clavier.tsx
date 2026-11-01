import { createContext, type ComponentRef, type RefObject } from 'react';
import type { TextInput } from 'react-native';

export type RefChamp = RefObject<ComponentRef<typeof TextInput> | null>;

export type Clavier = {
  inscrire: (r: RefChamp) => () => void;
  auFocus: (r: RefChamp) => void;
  deplacer: (r: RefChamp | null, sens: 1 | -1) => void;
};

/** Fourni par Ecran : amène le champ actif au-dessus du clavier et permet de passer au suivant. */
export const ClavierContexte = createContext<Clavier | null>(null);

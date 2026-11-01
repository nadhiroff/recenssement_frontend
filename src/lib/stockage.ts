import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CLE = 'jeton_session';

// SecureStore n'existe pas sur le web : la PWA garde le jeton dans le stockage local.
export async function lireJeton(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(CLE);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(CLE);
}

export async function ecrireJeton(jeton: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (jeton) window.localStorage.setItem(CLE, jeton);
      else window.localStorage.removeItem(CLE);
    } catch {
      // stockage bloqué : la session dure le temps de la page
    }
    return;
  }
  if (jeton) await SecureStore.setItemAsync(CLE, jeton);
  else await SecureStore.deleteItemAsync(CLE);
}

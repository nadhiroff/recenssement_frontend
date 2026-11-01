import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Pas de .env : adapter ici. Le chemin passe par index.php pour fonctionner avec ou sans mod_rewrite.
const CHEMIN_API = '/recenssement_famille-Backend/api/index.php/v1';

// En développement, le téléphone joint Apache sur le PC qui sert déjà l'application (même adresse).
// Émulateur Android sans serveur Expo : 10.0.2.2. En production : remplacer par https://domaine.
function apiNatif(): string {
  const hote = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${hote || '10.0.2.2'}${CHEMIN_API}`;
}

function apiWeb(): string {
  const { hostname, origin, pathname, port } = window.location;
  if (port === '8081' || port === '19006') {
    return `http://${hostname}${CHEMIN_API}`;
  }
  // PWA servie par le backend sous <racine>/app/
  const racine = pathname.split('/app')[0];
  return `${origin}${racine}/api/index.php/v1`;
}

export const API_URL = Platform.OS === 'web' && typeof window !== 'undefined' ? apiWeb() : apiNatif();
export const INDICATIF_DEFAUT = '+22901';
export const DELAI_RENVOI_OTP = 60;

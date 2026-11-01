import { Platform } from 'react-native';

// Pas de .env : adapter ici.
// Émulateur Android : http://10.0.2.2/recenssement_famille-Backend/api/v1
// Téléphone réel : http://<IP locale du PC Ubuntu>/recenssement_famille-Backend/api/v1
const API_NATIF = 'http://10.0.2.2/recenssement_famille-Backend/api/v1';

function apiWeb(): string {
  const { hostname, origin, pathname, port } = window.location;
  if (port === '8081' || port === '19006') {
    return `http://${hostname}/recenssement_famille-Backend/api/v1`;
  }
  // PWA servie par le backend sous <racine>/app/
  const racine = pathname.split('/app')[0];
  return `${origin}${racine}/api/v1`;
}

export const API_URL = Platform.OS === 'web' && typeof window !== 'undefined' ? apiWeb() : API_NATIF;
export const INDICATIF_DEFAUT = '+229';
export const DELAI_RENVOI_OTP = 60;

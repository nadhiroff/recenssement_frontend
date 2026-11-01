import { API_URL } from '@/config';
import { t } from '@/i18n';

import { lireJeton } from './stockage';

export class ErreurApi extends Error {
  constructor(
    public http: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
  /** Pas de réponse du serveur : à réessayer plus tard. */
  get reseau() {
    return this.http === 0;
  }
}

const DELAI_MS = 20000;
let surDeconnexion: () => void = () => {};
export const definirSurDeconnexion = (f: () => void) => {
  surDeconnexion = f;
};

export async function api<T = unknown>(
  methode: string,
  chemin: string,
  corps?: unknown
): Promise<T> {
  const jeton = await lireJeton();
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), DELAI_MS);
  let reponse: Response;
  try {
    reponse = await fetch(API_URL + chemin, {
      method: methode,
      signal: controle.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ErreurApi(0, 'reseau', t('erreurs.reseau'));
  } finally {
    clearTimeout(minuterie);
  }
  const json = await reponse.json().catch(() => null);
  if (!json?.ok) {
    if (reponse.status === 401 && jeton) surDeconnexion();
    const { code, message, ...extra } = json?.error ?? {};
    throw new ErreurApi(
      reponse.status,
      code ?? 'inconnu',
      message ?? t('erreurs.serveur'),
      extra
    );
  }
  return json.data as T;
}

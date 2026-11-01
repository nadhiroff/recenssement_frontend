import AsyncStorage from '@react-native-async-storage/async-storage';

import { ErreurApi } from './api';

/** File d'envoi hors ligne : chaque envoi porte un client_uuid, le rejeu est donc sans risque. */
export type Envoi = {
  client_uuid: string;
  chemin: string;
  corps: Record<string, unknown>;
  cree_le: number;
};

export type IssueEnvoi =
  | { type: 'reussi'; envoi: Envoi; resultat: unknown }
  | { type: 'refuse'; envoi: Envoi; erreur: ErreurApi };

type Poster = (chemin: string, corps: unknown) => Promise<unknown>;

const CLE = 'file_envoi';
let enCours: Promise<IssueEnvoi[]> | null = null;
const abonnes = new Set<(file: Envoi[]) => void>();

export async function lireFile(): Promise<Envoi[]> {
  const brut = await AsyncStorage.getItem(CLE);
  return brut ? (JSON.parse(brut) as Envoi[]) : [];
}

async function ecrire(file: Envoi[]) {
  await AsyncStorage.setItem(CLE, JSON.stringify(file));
  abonnes.forEach((f) => f(file));
}

export function abonnerFile(f: (file: Envoi[]) => void) {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

export async function ajouterEnvoi(envoi: Omit<Envoi, 'cree_le'>) {
  const file = await lireFile();
  await ecrire([...file.filter((e) => e.client_uuid !== envoi.client_uuid), { ...envoi, cree_le: Date.now() }]);
}

/** À la déconnexion : les envois d'un compte ne doivent pas partir sous le compte suivant. */
export const effacerFile = () => ecrire([]);

/**
 * Rejoue la file dans l'ordre. Sans réseau ou sur erreur serveur, l'envoi reste en file ;
 * une réponse 4xx le sort de la file et remonte à l'appelant, qui décide quoi en faire.
 */
export function viderFile(poster: Poster): Promise<IssueEnvoi[]> {
  enCours ??= traiter(poster).finally(() => {
    enCours = null;
  });
  return enCours;
}

async function traiter(poster: Poster): Promise<IssueEnvoi[]> {
  const issues: IssueEnvoi[] = [];
  for (const envoi of await lireFile()) {
    try {
      const resultat = await poster(envoi.chemin, envoi.corps);
      await retirer(envoi);
      issues.push({ type: 'reussi', envoi, resultat });
    } catch (e) {
      if (!(e instanceof ErreurApi) || e.reseau || e.http >= 500 || e.http === 429 || e.http === 401) {
        break;
      }
      await retirer(envoi);
      issues.push({ type: 'refuse', envoi, erreur: e });
    }
  }
  return issues;
}

async function retirer(envoi: Envoi) {
  await ecrire((await lireFile()).filter((e) => e.client_uuid !== envoi.client_uuid));
}

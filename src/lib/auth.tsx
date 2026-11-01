import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, definirSurDeconnexion } from './api';
import { effacerFile } from './file';
import { ecrireJeton, lireJeton } from './stockage';

export type Nom = { id?: number; type: string; valeur: string; principal?: boolean };

export type Personne = {
  id: number;
  nom_complet: string;
  noms: Nom[];
  sexe: 'M' | 'F' | 'I';
  annee_naissance: number | null;
  mois_naissance?: number | null;
  jour_naissance?: number | null;
  precision_naissance: string;
  annee_deces: number | null;
  est_decede: boolean;
  branche_id: number | null;
  est_fondateur: boolean;
  telephone_whatsapp?: string | null;
  email?: string | null;
  lieu_residence?: string | null;
  est_privee?: boolean;
};

export type Moi = {
  id: number;
  role: 'membre' | 'relais' | 'referent' | 'admin';
  telephone: string | null;
  email: string | null;
  personne: Personne | null;
  branches_referent: number[];
  branches_relais: number[];
  notifications_non_lues: number;
};

type Session = {
  pret: boolean;
  connecte: boolean;
  moi: Moi | undefined;
  chargementMoi: boolean;
  ouvrir: (jeton: string) => Promise<void>;
  /** Déconnexion demandée : ferme la session sur le serveur et efface les données locales. */
  fermer: () => Promise<void>;
  /** La session n'existe déjà plus : on retourne simplement à l'accueil. */
  sessionPerdue: () => Promise<void>;
  recharger: () => Promise<unknown>;
};

const Contexte = createContext<Session | null>(null);
const DELAI_DECONNEXION_MS = 2500;
const INTERVALLE_ALERTES_MS = 120_000;

export function SessionFournie({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [pret, setPret] = useState(false);
  const [jeton, setJeton] = useState<string | null>(null);
  const connecte = jeton !== null;

  const enFermeture = useRef(false);

  const sessionPerdue = useCallback(async () => {
    await ecrireJeton(null);
    setJeton(null);
    client.clear();
  }, [client]);

  const fermer = useCallback(async () => {
    if (enFermeture.current) return;
    enFermeture.current = true;
    // Sans réseau on n'attend pas : le jeton est de toute façon oublié sur ce téléphone.
    const pushToken = await AsyncStorage.getItem('jeton_push');
    await Promise.race([
      api('POST', '/auth/logout', { push_token: pushToken ?? undefined }).catch(() => {}),
      new Promise((fini) => setTimeout(fini, DELAI_DECONNEXION_MS)),
    ]);
    await AsyncStorage.multiRemove(['brouillon.soi', 'brouillon.tiers', 'jeton_push']);
    await effacerFile();
    await sessionPerdue();
    enFermeture.current = false;
  }, [sessionPerdue]);

  useEffect(() => {
    definirSurDeconnexion(() => {
      if (!enFermeture.current) void sessionPerdue();
    });
    lireJeton().then((j) => {
      setJeton(j);
      setPret(true);
    });
  }, [sessionPerdue]);

  const requete = useQuery({
    // Le profil appartient à une session : un changement de compte ne doit jamais relire l'ancien.
    queryKey: ['moi', jeton?.slice(-8)],
    queryFn: () => api<Moi>('GET', '/me'),
    enabled: connecte,
    staleTime: 0,
    // Nouvelles alertes vues sans push, seulement quand l'application est au premier plan.
    refetchInterval: INTERVALLE_ALERTES_MS,
  });

  // Le formulaire doit rester utilisable hors ligne : la liste des branches est gardée dès la connexion.
  useEffect(() => {
    if (connecte) {
      void client.prefetchQuery({ queryKey: ['branches'], queryFn: () => api('GET', '/branches'), staleTime: 3600_000 });
    }
  }, [client, connecte]);

  const valeur = useMemo<Session>(
    () => ({
      pret,
      connecte,
      moi: requete.data,
      // Un cache « sans fiche » peut être périmé : on attend le serveur avant d'orienter vers l'inscription.
      chargementMoi: connecte && !requete.data?.personne && requete.fetchStatus === 'fetching',
      ouvrir: async (nouveau) => {
        await ecrireJeton(nouveau);
        client.clear();
        setJeton(nouveau);
      },
      fermer,
      sessionPerdue,
      recharger: requete.refetch,
    }),
    [client, pret, connecte, requete.data, requete.fetchStatus, fermer, sessionPerdue, requete.refetch]
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession(): Session {
  const v = useContext(Contexte);
  if (!v) throw new Error('SessionFournie manquant');
  return v;
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, definirSurDeconnexion } from './api';
import { ecrireJeton, lireJeton } from './stockage';

export type Nom = { id?: number; type: string; valeur: string; principal?: boolean };

export type Personne = {
  id: number;
  nom_complet: string;
  noms: Nom[];
  sexe: 'M' | 'F' | 'I';
  annee_naissance: number | null;
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
  fermer: () => Promise<void>;
  recharger: () => Promise<unknown>;
};

const Contexte = createContext<Session | null>(null);

export function SessionFournie({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [pret, setPret] = useState(false);
  const [connecte, setConnecte] = useState(false);

  const fermer = useCallback(async () => {
    await ecrireJeton(null);
    setConnecte(false);
    client.clear();
  }, [client]);

  useEffect(() => {
    definirSurDeconnexion(() => void fermer());
    lireJeton().then((j) => {
      setConnecte(!!j);
      setPret(true);
    });
  }, [fermer]);

  const requete = useQuery({
    queryKey: ['moi'],
    queryFn: () => api<Moi>('GET', '/me'),
    enabled: connecte,
    staleTime: 0,
  });

  const valeur = useMemo<Session>(
    () => ({
      pret,
      connecte,
      moi: requete.data,
      // Un cache « sans fiche » peut être périmé : on attend le serveur avant d'orienter vers l'inscription.
      chargementMoi: connecte && !requete.data?.personne && requete.fetchStatus === 'fetching',
      ouvrir: async (jeton) => {
        await ecrireJeton(jeton);
        setConnecte(true);
      },
      fermer,
      recharger: requete.refetch,
    }),
    [pret, connecte, requete.data, requete.fetchStatus, fermer, requete.refetch]
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession(): Session {
  const v = useContext(Contexte);
  if (!v) throw new Error('SessionFournie manquant');
  return v;
}

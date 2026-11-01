import NetInfo from '@react-native-community/netinfo';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { t } from '@/i18n';

import { api } from './api';
import { abonnerFile, type Envoi, type IssueEnvoi, lireFile, viderFile } from './file';
import { vibrerSucces } from './retour';

type Reseau = {
  enLigne: boolean;
  enAttente: number;
  /** Dernier refus du serveur, à traiter par le parcours d'inscription. */
  refus: Extract<IssueEnvoi, { type: 'refuse' }> | null;
  oublierRefus: () => void;
  synchroniser: () => Promise<IssueEnvoi[]>;
  message: string | null;
};

const Contexte = createContext<Reseau | null>(null);
const INTERVALLE_REPRISE = 30000;

// Pas de sonde vers un serveur tiers : elle consomme de la 3G et peut échouer alors que le réseau marche.
// Un serveur injoignable se traite à l'envoi, par la file.
NetInfo.configure({ reachabilityShouldRun: () => false, useNativeReachability: false });

export function ReseauFourni({ children, surReussite }: { children: ReactNode; surReussite?: (e: Envoi) => void }) {
  const client = useQueryClient();
  const [enLigne, setEnLigne] = useState(true);
  const [enAttente, setEnAttente] = useState(0);
  const [refus, setRefus] = useState<Reseau['refus']>(null);
  const [message, setMessage] = useState<string | null>(null);
  const rappel = useRef(surReussite);
  useEffect(() => {
    rappel.current = surReussite;
  }, [surReussite]);

  const synchroniser = useCallback(async () => {
    const issues = await viderFile((chemin, corps) => api('POST', chemin, corps));
    for (const issue of issues) {
      if (issue.type === 'reussi') {
        rappel.current?.(issue.envoi);
        vibrerSucces();
        setMessage(t('horsLigne.envoye'));
        client.invalidateQueries();
      } else {
        setRefus(issue);
      }
    }
    return issues;
  }, [client]);

  useEffect(() => {
    lireFile().then((f) => setEnAttente(f.length));
    const desabonner = abonnerFile((f) => setEnAttente(f.length));
    const arret = NetInfo.addEventListener((etat) => {
      const ok = etat.isConnected !== false;
      setEnLigne(ok);
      onlineManager.setOnline(ok);
      if (ok) void synchroniser();
    });
    // Couvre les erreurs serveur passagères : la file repart sans attendre un changement de réseau.
    const reprise = setInterval(() => void synchroniser(), INTERVALLE_REPRISE);
    return () => {
      desabonner();
      arret();
      clearInterval(reprise);
    };
  }, [synchroniser]);

  return (
    <Contexte.Provider
      value={{ enLigne, enAttente, refus, oublierRefus: () => setRefus(null), synchroniser, message }}>
      {children}
    </Contexte.Provider>
  );
}

export function useReseau(): Reseau {
  const v = useContext(Contexte);
  if (!v) throw new Error('ReseauFourni manquant');
  return v;
}

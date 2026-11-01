import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { Ecran } from '@/components/Ecran';
import { Bouton, Erreur, Muet, Squelette } from '@/components/ui';
import { EnteteFiche, FamilleFiche, InfosFiche } from '@/features/personne/Details';
import { OrdreEpouses } from '@/features/personne/OrdreEpouses';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useSession, type Personne } from '@/lib/auth';

export default function FichePersonne() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { moi } = useSession();
  const fiche = useQuery({ queryKey: ['personne', id], queryFn: () => api<Personne>('GET', `/personnes/${id}`) });
  const p = fiche.data;
  return (
    <Ecran pied={<Bouton variante="contour" titre={t('commun.retour')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/arbre'))} />}>
      {fiche.isPending ? <Squelette hauteur={200} /> : null}
      <Erreur>{fiche.error?.message}</Erreur>
      {p ? (
        <>
          <EnteteFiche p={p} />
          <InfosFiche p={p} />
          <FamilleFiche id={p.id} />
          {p.sexe === 'M' && !!p.branche_id && moi?.branches_referent.includes(p.branche_id) ? <OrdreEpouses epouxId={p.id} /> : null}
          {moi?.role === 'membre' || moi?.role === 'relais' ? <Muet v="petit">{t('personne.masque')}</Muet> : null}
        </>
      ) : null}
    </Ecran>
  );
}

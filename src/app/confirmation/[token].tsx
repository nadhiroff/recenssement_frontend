import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';

import { Ecran } from '@/components/Ecran';
import { Bouton, Carte, Erreur, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { vibrerSucces } from '@/lib/retour';

type Infos = { parent: string; enfant: string; role: string; deja_repondu: boolean; statut_attendu: boolean };

export default function Confirmation() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const infos = useQuery({ queryKey: ['confirmation', token], queryFn: () => api<Infos>('GET', `/confirmations/${token}`), retry: false, gcTime: 0 });
  const repondre = useMutation({
    mutationFn: (reponse: string) => api('POST', `/confirmations/${token}`, { reponse }),
    onSuccess: vibrerSucces,
  });
  const d = infos.data;
  return (
    <Ecran>
      <T v="titre">{t('confirmation.titre')}</T>
      {infos.isPending ? <Squelette hauteur={140} /> : null}
      <Erreur>{infos.error?.message ?? repondre.error?.message}</Erreur>
      {repondre.isSuccess ? (
        <Carte>
          <T>{t('confirmation.merci')}</T>
        </Carte>
      ) : d && !d.statut_attendu ? (
        <Carte>
          <T>{t('confirmation.dejaTraite')}</T>
        </Carte>
      ) : d ? (
        <>
          <Carte>
            <T>{t('confirmation.question', { parent: d.parent, role: d.role, enfant: d.enfant })}</T>
          </Carte>
          <Bouton testID="oui" titre={t('confirmation.oui')} chargement={repondre.isPending} onPress={() => repondre.mutate('oui')} />
          <Bouton variante="contour" titre={t('confirmation.non')} onPress={() => repondre.mutate('non')} />
          <Bouton variante="texte" titre={t('confirmation.nsp')} onPress={() => repondre.mutate('ne_sait_pas')} />
        </>
      ) : null}
    </Ecran>
  );
}

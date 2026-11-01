import { router } from 'expo-router';

import { Ecran } from '@/components/Ecran';
import { Bouton, Carte, Muet, T } from '@/components/ui';
import { t } from '@/i18n';
import { useSession } from '@/lib/auth';

export default function Fiche() {
  const { moi, fermer } = useSession();
  return (
    <Ecran>
      <T v="titre">{t('fiche.titre')}</T>
      <Carte>
        <T gras>{moi?.personne?.nom_complet}</T>
        <Muet>{moi?.telephone}</Muet>
      </Carte>
      <Bouton variante="contour" titre={t('fiche.inscrireProche')} onPress={() => router.push('/tiers')} />
      <Bouton variante="texte" titre={t('fiche.deconnexion')} onPress={fermer} />
    </Ecran>
  );
}

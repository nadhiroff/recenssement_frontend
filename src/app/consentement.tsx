import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { Ecran } from '@/components/Ecran';
import { Bouton, Carte, Case, Erreur, T } from '@/components/ui';
import { brouillonVide, ecrireBrouillon, lireBrouillon } from '@/features/inscription/modele';
import { t } from '@/i18n';
import { useSession } from '@/lib/auth';

export default function Consentement() {
  const { connecte } = useSession();
  const [accepte, setAccepte] = useState(false);
  const [erreur, setErreur] = useState<string>();
  if (!connecte) return <Redirect href="/accueil" />;

  const continuer = async () => {
    if (!accepte) {
      setErreur(t('consentement.obligatoire'));
      return;
    }
    const b = (await lireBrouillon('soi')) ?? brouillonVide();
    await ecrireBrouillon('soi', { ...b, consentement: true });
    router.replace('/inscription');
  };

  return (
    <Ecran pied={<Bouton testID="accepter" titre={t('commun.continuer')} onPress={continuer} />}>
      <T v="titre">{t('consentement.titre')}</T>
      <Carte>
        <T>{t('consentement.texte')}</T>
      </Carte>
      <Case coche={accepte} onChange={setAccepte}>
        {t('consentement.accepter')}
      </Case>
      <Erreur>{erreur}</Erreur>
    </Ecran>
  );
}

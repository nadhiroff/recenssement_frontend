import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { Ecran } from '@/components/Ecran';
import { Bouton, Carte, Case, Dialogue, Muet, T } from '@/components/ui';
import { EnteteFiche, FamilleFiche, InfosFiche, Ligne } from '@/features/personne/Details';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { useReseau } from '@/lib/reseau';
import { useTheme } from '@/theme';

export default function Fiche() {
  const { moi, fermer, sessionPerdue } = useSession();
  const { enAttente } = useReseau();
  const { grandTexte, basculerGrandTexte } = useTheme();
  const p = moi?.personne;
  const [demandeDeconnexion, setDemandeDeconnexion] = useState(false);
  const [demandeRetrait, setDemandeRetrait] = useState(false);

  const deconnexion = useMutation({ mutationFn: fermer });
  const retirer = useMutation({
    mutationFn: () => api('POST', `/personnes/${p?.id}/retrait`, { confirmation: true }),
    onSuccess: sessionPerdue,
  });

  return (
    <Ecran>
      {p ? (
        <>
          <EnteteFiche p={p} />
          <Bouton testID="modifier-fiche" titre={t('fiche.corriger')} onPress={() => router.push('/fiche-modifier')} />
          <InfosFiche p={p} />
          <FamilleFiche id={p.id} />
        </>
      ) : (
        <>
          <T v="titre">{t('fiche.titre')}</T>
          <Muet>{t('fiche.pasDeFiche')}</Muet>
          <Bouton titre={t('fiche.sInscrire')} onPress={() => router.push('/consentement')} />
        </>
      )}
      <Carte>
        <T v="sousTitre">{t('fiche.compte')}</T>
        <Ligne libelle={t('fiche.numero')} valeur={moi?.telephone} />
        <Ligne libelle={t('fiche.emailConnexion')} valeur={moi?.email} />
        {moi ? <Ligne libelle={t('fiche.role')} valeur={t(`fiche.roles.${moi.role}`)} /> : null}
      </Carte>
      {p ? <Bouton variante="contour" titre={t('fiche.inscrireProche')} onPress={() => router.push('/tiers')} /> : null}
      <Case coche={grandTexte} onChange={basculerGrandTexte}>
        {t('fiche.grandTexte')}
      </Case>
      <Bouton testID="deconnexion" variante="contour" titre={t('fiche.deconnexion')} onPress={() => setDemandeDeconnexion(true)} />
      {p ? <Bouton testID="retirer" variante="texte" titre={t('fiche.retirer')} onPress={() => setDemandeRetrait(true)} /> : null}

      <Dialogue
        visible={demandeDeconnexion}
        titre={t('fiche.deconnexionTitre')}
        texte={[t('fiche.deconnexionTexte'), enAttente > 0 ? t('fiche.deconnexionAttente', { n: enAttente }) : ''].filter(Boolean).join(' ')}
        oui={t('fiche.oui')}
        non={t('fiche.non')}
        chargement={deconnexion.isPending}
        surOui={() => deconnexion.mutate()}
        surNon={() => setDemandeDeconnexion(false)}
      />
      <Dialogue
        visible={demandeRetrait}
        danger
        titre={t('fiche.retirerTitre')}
        texte={t('fiche.retirerTexte')}
        oui={t('fiche.confirmerRetrait')}
        non={t('fiche.nonGarder')}
        chargement={retirer.isPending}
        erreur={retirer.error?.message}
        surOui={() => retirer.mutate()}
        surNon={() => setDemandeRetrait(false)}
      />
    </Ecran>
  );
}

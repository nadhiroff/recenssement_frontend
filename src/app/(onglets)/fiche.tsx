import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { Ecran } from '@/components/Ecran';
import { Bouton, Carte, Case, Champ, Erreur, Muet, T } from '@/components/ui';
import { decrire } from '@/features/inscription/CarteCandidat';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { vibrerSucces } from '@/lib/retour';
import { useTheme } from '@/theme';

export default function Fiche() {
  const { moi, fermer, recharger } = useSession();
  const { grandTexte, basculerGrandTexte } = useTheme();
  const p = moi?.personne;
  const [edition, setEdition] = useState(false);
  const [retrait, setRetrait] = useState(false);
  const [prenoms, setPrenoms] = useState('');
  const [lieu, setLieu] = useState('');
  const [annee, setAnnee] = useState('');

  const enregistrer = useMutation({
    mutationFn: () =>
      api('PATCH', `/personnes/${p?.id}`, {
        prenoms,
        lieu_residence: lieu,
        annee_naissance: annee === '' ? null : Number(annee),
      }),
    onSuccess: async () => {
      vibrerSucces();
      await recharger();
      setEdition(false);
    },
  });
  const retirer = useMutation({
    mutationFn: () => api('POST', `/personnes/${p?.id}/retrait`, { confirmation: true }),
    onSuccess: async () => {
      await fermer();
      router.replace('/accueil');
    },
  });

  const ouvrirEdition = () => {
    setPrenoms(p?.noms.find((n) => n.type === 'naissance')?.valeur ?? '');
    setLieu(p?.lieu_residence ?? '');
    setAnnee(p?.annee_naissance ? String(p.annee_naissance) : '');
    setEdition(true);
  };

  return (
    <Ecran>
      <T v="titre">{t('fiche.titre')}</T>
      {p ? (
        <Carte>
          <T gras>{p.nom_complet}</T>
          {decrire(p) ? <Muet>{decrire(p)}</Muet> : null}
          {p.lieu_residence ? <Muet>{p.lieu_residence}</Muet> : null}
          <Muet>{moi?.telephone}</Muet>
        </Carte>
      ) : (
        <Bouton titre={t('fiche.sInscrire')} onPress={() => router.push('/consentement')} />
      )}
      {p && edition ? (
        <Carte>
          <Champ label={t('fiche.prenoms')} value={prenoms} onChangeText={setPrenoms} />
          <Champ label={t('fiche.annee')} keyboardType="number-pad" maxLength={4} value={annee} onChangeText={setAnnee} />
          <Champ label={t('fiche.lieu')} value={lieu} onChangeText={setLieu} />
          <Erreur>{enregistrer.error?.message}</Erreur>
          <Bouton titre={t('commun.enregistrer')} chargement={enregistrer.isPending} onPress={() => enregistrer.mutate()} />
          <Bouton variante="texte" titre={t('commun.annuler')} onPress={() => setEdition(false)} />
        </Carte>
      ) : null}
      {p && !edition ? <Bouton variante="contour" titre={t('fiche.corriger')} onPress={ouvrirEdition} /> : null}
      {p ? <Bouton variante="contour" titre={t('fiche.inscrireProche')} onPress={() => router.push('/tiers')} /> : null}
      <Case coche={grandTexte} onChange={basculerGrandTexte}>
        {t('fiche.grandTexte')}
      </Case>
      <Bouton variante="texte" titre={t('fiche.deconnexion')} onPress={fermer} />
      {p && retrait ? (
        <Carte>
          <T>{t('fiche.retirerTexte')}</T>
          <Erreur>{retirer.error?.message}</Erreur>
          <Bouton variante="danger" titre={t('fiche.confirmerRetrait')} chargement={retirer.isPending} onPress={() => retirer.mutate()} />
          <Bouton variante="texte" titre={t('commun.annuler')} onPress={() => setRetrait(false)} />
        </Carte>
      ) : null}
      {p && !retrait ? <Bouton variante="texte" titre={t('fiche.retirer')} onPress={() => setRetrait(true)} /> : null}
    </Ecran>
  );
}

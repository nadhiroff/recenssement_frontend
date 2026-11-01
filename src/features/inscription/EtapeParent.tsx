import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { Bouton, Carte, Case, Champ, Choix, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api, ErreurApi } from '@/lib/api';
import type { Personne } from '@/lib/auth';
import { espace } from '@/theme/tokens';

import { CarteCandidat, type Candidat } from './CarteCandidat';
import { type Brouillon, PRECISIONS, parentVide } from './modele';

type Epouse = { union_id: number; rang_epouse: number; personne: Personne };

export const DELAI_RECHERCHE = 500;

function useDiffere<V>(valeur: V, delai: number): V {
  const [v, setV] = useState(valeur);
  useEffect(() => {
    const m = setTimeout(() => setV(valeur), delai);
    return () => clearTimeout(m);
  }, [valeur, delai]);
  return v;
}

export function EtapeParent({ role, enLigne }: { role: 'pere' | 'mere'; enLigne: boolean }) {
  const { setValue, control } = useFormContext<Brouillon>();
  const parent = useWatch({ control, name: role });
  const branche = useWatch({ control, name: 'branche_id' });
  const pere = useWatch({ control, name: 'pere' });
  const [saisieLibre, setSaisieLibre] = useState(false);

  const epouses = useQuery({
    queryKey: ['epouses', pere.personne_id],
    queryFn: () => api<Epouse[]>('GET', `/personnes/${pere.personne_id}/epouses`),
    enabled: role === 'mere' && pere.mode === 'existante' && !!pere.personne_id,
  });

  const critere = useDiffere(
    { prenoms: parent.prenoms.trim(), annee: parent.annee_naissance, nomParent: parent.parent_nom.trim() },
    DELAI_RECHERCHE
  );
  const candidats = useQuery({
    queryKey: ['candidats', role, branche, critere],
    queryFn: () =>
      api<Candidat[]>('POST', '/rapprochement/candidats', {
        prenoms: critere.prenoms,
        annee_naissance: critere.annee === '' ? null : Number(critere.annee),
        pere_nom: critere.nomParent || undefined,
        branche_id: branche,
      }),
    enabled: enLigne && parent.mode === 'a_choisir' && critere.prenoms.length >= 2,
    staleTime: 60_000,
  });

  const choisir = (p: Personne) => {
    setValue(role, { ...parent, mode: 'existante', personne_id: p.id, apercu: p.nom_complet });
  };
  const changer = (nom: 'nom_famille' | 'prenoms' | 'annee_naissance' | 'parent_nom', v: string) => {
    setValue(`${role}.${nom}`, v, { shouldDirty: true });
  };

  if (parent.mode === 'existante') {
    return (
      <Carte>
        <T testID="fiche-choisie" gras>
          {t('inscription.ficheChoisie', { nom: parent.apercu })}
        </T>
        <Bouton variante="texte" titre={t('inscription.changer')} onPress={() => setValue(role, parentVide())} />
      </Carte>
    );
  }
  if (parent.mode === 'inconnu') {
    return (
      <Carte>
        <T gras>{t('inscription.inconnu')}</T>
        <Bouton variante="texte" titre={t('inscription.changer')} onPress={() => setValue(role, parentVide())} />
      </Carte>
    );
  }

  const epousesConnues = epouses.data ?? [];
  if (role === 'mere' && epousesConnues.length > 0 && !saisieLibre) {
    return (
      <View style={{ gap: espace.m }}>
        <T v="sousTitre">{t('inscription.epousesPere')}</T>
        {epousesConnues.map((e, i) => (
          <CarteCandidat
            key={e.union_id}
            rang={i}
            candidat={{ personne: e.personne, score: 0, filiation: null }}
            onChoisir={() => choisir(e.personne)}
          />
        ))}
        <Bouton variante="contour" titre={t('inscription.autreMere')} onPress={() => setSaisieLibre(true)} />
      </View>
    );
  }

  const liste = candidats.data ?? [];
  return (
    <View style={{ gap: espace.m }}>
      <Muet>{t(`inscription.parentTexte.${role}`)}</Muet>
      <Champ label={t('inscription.nomFamille')} autoCapitalize="characters" value={parent.nom_famille} onChangeText={(v) => changer('nom_famille', v)} />
      <Champ testID={`${role}-prenoms`} label={t('inscription.prenoms')} value={parent.prenoms} onChangeText={(v) => changer('prenoms', v)} />
      <Champ label={t('inscription.anneeNaissance')} aide={t('inscription.anneeAide')} keyboardType="number-pad" maxLength={4} value={parent.annee_naissance} onChangeText={(v) => changer('annee_naissance', v)} />
      <Choix
        label={t('inscription.precision')}
        valeur={parent.precision_naissance}
        onChange={(v) => setValue(`${role}.precision_naissance`, v)}
        options={PRECISIONS.map((p) => ({ valeur: p, libelle: t(`inscription.precisions.${p}`) }))}
      />
      <Champ label={t(`inscription.parentNom.${role}`)} value={parent.parent_nom} onChangeText={(v) => changer('parent_nom', v)} />
      <Case coche={parent.est_decede} onChange={(v) => setValue(`${role}.est_decede`, v)}>
        {t('inscription.decede')}
      </Case>

      {!enLigne ? <Muet v="petit">{t('inscription.horsLigneRecherche')}</Muet> : null}
      {candidats.isFetching && liste.length === 0 ? <Squelette /> : null}
      {candidats.error instanceof ErreurApi && !candidats.error.reseau ? <Erreur>{candidats.error.message}</Erreur> : null}
      {liste.length > 0 ? <T v="sousTitre">{t('inscription.propositions')}</T> : null}
      {liste.map((cand, i) => (
        <CarteCandidat key={i} rang={i} candidat={cand} onChoisir={() => 'personne' in cand && choisir(cand.personne)} />
      ))}
      {liste.length > 0 ? (
        <Bouton
          testID="pas-lui"
          variante="contour"
          titre={t('inscription.pasLui')}
          onPress={() => setValue(role, { ...parent, mode: 'nouvelle', rapprochement_vu: true })}
        />
      ) : null}
      <Bouton
        variante="texte"
        titre={t('inscription.jeNeSaisPas')}
        onPress={() => setValue(role, { ...parentVide(), mode: 'inconnu' })}
      />
    </View>
  );
}
